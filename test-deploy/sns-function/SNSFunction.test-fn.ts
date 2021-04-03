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
import { ApiGatewayFunction, BaseFunction, SNSFunction } from '../../src';
import { TestPollerFunction, TestStarterFunction } from '../../agb-aws-test-deploy';
import TestStateRepository, { TestStateItem } from '../../agb-aws-test-deploy/TestStateRepository';
import { TestPollResponse } from '../../agb-aws-test-deploy/TestRunner';
import { DynamoDBClient } from '../../agb-aws-clients';

BaseFunction.Log = log;
ApiGatewayFunction.Log = log;
SNSFunction.Log = log;

const snsClient = new SNSClient(process.env.SNS_FUNCTION_TOPIC_ARN);
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.TEST_TABLE_NAME)
);

export enum Scenarios {
  ReceivesMessage = 'receives_message',
  HandlesError = 'handles_error',
}

interface TestMessage {
  scenario: string;
}

// Test starter function

class SNSFunctionTestStarterFunction extends TestStarterFunction {
  //
  getTestParams(): any | undefined {}

  async startTestAsync(scenario: string): Promise<void> {
    //
    switch (scenario) {
      //
      case Scenarios.ReceivesMessage:
      case Scenarios.HandlesError:
        await snsClient.publishMessageAsync({ scenario });
        break;

      default:
        throw new Error(`Unhandled testScenario: ${scenario}`);
    }
  }
}

const snsFunctionTestStarterFunction = new SNSFunctionTestStarterFunction(testStateRepository);

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SNSFunction<TestMessage> {
  //
  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    if (message.scenario === Scenarios.HandlesError) {
      throw new Error(`Test error`);
    }

    await testStateRepository.putCurrentScenarioItemAsync('result', { success: true });
  }

  protected async handleErrorAsync(error: any): Promise<void> {
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
  async pollTestAsync(scenario: string, scenarioItems: TestStateItem[]): Promise<TestPollResponse> {
    //
    switch (scenario) {
      //
      case Scenarios.ReceivesMessage:
        return {
          success: scenarioItems[0].itemData.success === true,
        };

      case Scenarios.HandlesError:
        return {
          success: scenarioItems[0].itemData.errorMessage === 'Test error',
        };

      default:
        throw new Error(`Unhandled scenario: ${scenario}`);
    }
  }
}

const snsFunctionTestPollerFunction = new SNSFunctionTestPollerFunction(testStateRepository);

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());
