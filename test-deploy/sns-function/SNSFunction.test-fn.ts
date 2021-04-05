/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { SNSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import { SNSFunction } from '../../src';
import {
  TestPollerFunction,
  TestPollResponse,
  TestStarterFunction,
  TestStateRepository,
} from '../../agb-aws-test-deploy';
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
    //
    super(testStateRepository, { log });

    this.testParams = {
      [Scenarios.HandlesMessageBatch]: (): Record<string, any> => ({ batchSize: 10 }),
    };

    this.tests = {
      //
      [Scenarios.HandlesMessage]: async ({ scenario }): Promise<any> =>
        snsClient.publishMessageAsync({ scenario }),

      [Scenarios.HandlesError]: async ({ scenario }): Promise<any> =>
        snsClient.publishMessageAsync({ scenario }),

      [Scenarios.HandlesMessageBatch]: async ({ scenario, params }): Promise<any> => {
        const publishMessagePromises = Array.from(Array(params.batchSize).keys()).map((index) =>
          snsClient.publishMessageAsync({ scenario, index })
        );
        return await Promise.all(publishMessagePromises);
      },
    };
  }
}

const snsFunctionTestStarterFunction = new SNSFunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Test poller function

class SNSFunctionTestPollerFunction extends TestPollerFunction {
  //
  constructor() {
    //
    super(testStateRepository, { log });

    this.tests = {
      //
      [Scenarios.HandlesMessage]: ({ items }): TestPollResponse => ({
        success: items.length === 1 && items[0].itemData.success === true,
      }),

      [Scenarios.HandlesError]: ({ items }): TestPollResponse => ({
        success: items.length === 1 && items[0].itemData.errorMessage === 'Test error',
      }),

      [Scenarios.HandlesMessageBatch]: ({ items, params }): TestPollResponse => {
        if (items.length < params.batchSize) {
          return {};
        }
        return {
          success: items.every((item) => item.itemData.success === true),
        };
      },
    };
  }
}

const snsFunctionTestPollerFunction = new SNSFunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestPollerFunction.handleAsync(event, context)
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
        await testStateRepository.putCurrentTestItemAsync('message', { success: true });
        break;

      case Scenarios.HandlesMessageBatch:
        await testStateRepository.putCurrentTestItemAsync(`message-${message.index}`, {
          success: true,
        });
        break;

      case Scenarios.HandlesError:
        throw new Error(`Test error`);

      default:
        throw new Error(`Unhandled scenario: ${message.scenario}`);
    }
  }

  async handleErrorAsync(error: any, event: SNSEvent, eventRecord: SNSEventRecord): Promise<void> {
    await super.handleErrorAsync(error, event, eventRecord);
    await testStateRepository.putCurrentTestItemAsync('result', {
      errorMessage: error.message,
    });
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
);
