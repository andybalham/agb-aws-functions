/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { SNSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import { SNSFunction } from '../../src';
import { TestPollerFunction, TestStarterFunction } from '../../agb-aws-test-deploy';
import TestStateRepository, { TestStateItem } from '../../agb-aws-test-deploy/TestStateRepository';
import { TestPollResponse } from '../../agb-aws-test-deploy/TestRunner';
import { DynamoDBClient } from '../../agb-aws-clients';

const snsClient = new SNSClient(process.env.SNS_FUNCTION_TOPIC_ARN);
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.TEST_TABLE_NAME)
);

export enum Scenarios {
  HandlesMessage = 'handles_message',
  HandlesMessageBatch = 'handles_message_batch',
  HandlesError = 'handles_error',
}

interface TestMessage {
  scenario: string;
  index?: number;
}

// Test starter function

class SNSFunctionTestStarterFunction extends TestStarterFunction {
  //
  constructor() {
    super(testStateRepository, { log });
  }

  async startTestAsync(scenario: string): Promise<void> {
    //
    switch (scenario) {
      //
      case Scenarios.HandlesMessage:
      case Scenarios.HandlesError:
        await snsClient.publishMessageAsync({ scenario });
        break;

      case Scenarios.HandlesMessageBatch:
        {
          const publishMessagePromises = Array.from(Array(10).keys()).map((index) =>
            snsClient.publishMessageAsync({ scenario, index })
          );
          await Promise.all(publishMessagePromises);
        }
        break;

      default:
        throw new Error(`Unhandled testScenario: ${scenario}`);
    }
  }
}

const snsFunctionTestStarterFunction = new SNSFunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SNSFunction<TestMessage> {
  //
  constructor() {
    super({ log });
  }

  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    switch (message.scenario) {
      //
      case Scenarios.HandlesMessage:
        await testStateRepository.putCurrentScenarioItemAsync('message', { success: true });
        break;

      case Scenarios.HandlesMessageBatch:
        await testStateRepository.putCurrentScenarioItemAsync(`message-${message.index}`, {
          success: true,
        });
        break;

      case Scenarios.HandlesError:
        throw new Error(`Test error`);

      default:
        throw new Error(`Unhandled scenario: ${message.scenario}`);
    }
  }

  async handleErrorAsync(error: any, message: TestMessage): Promise<void> {
    await super.handleErrorAsync(error, message);
    await testStateRepository.putCurrentScenarioItemAsync('result', {
      errorMessage: error.message,
    });
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
);

// Test poller function

class SNSFunctionTestPollerFunction extends TestPollerFunction {
  //
  constructor() {
    super(testStateRepository, { log });
  }

  async pollTestAsync(scenario: string, scenarioItems: TestStateItem[]): Promise<TestPollResponse> {
    //
    switch (scenario) {
      //
      case Scenarios.HandlesMessage:
        return {
          success: scenarioItems[0].itemData.success === true,
        };

      case Scenarios.HandlesMessageBatch: {
        if (scenarioItems.length < 10) {
          return {};
        }
        return {
          success: scenarioItems.every((item) => item.itemData.success === true),
        };
      }

      case Scenarios.HandlesError:
        return {
          success: scenarioItems[0].itemData.errorMessage === 'Test error',
        };

      default:
        throw new Error(`Unhandled scenario: ${scenario}`);
    }
  }
}

const snsFunctionTestPollerFunction = new SNSFunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());
