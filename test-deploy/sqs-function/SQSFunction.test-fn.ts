// eslint-disable-next-line import/prefer-default-export
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { SQSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import sqsBatch from '@middy/sqs-partial-batch-failure';
import { ApiGatewayFunction, BaseFunction, SQSFunction } from '../../src';
import { TestPollerFunction, TestStarterFunction } from '../../agb-aws-test-deploy';
import TestStateRepository, { TestStateItem } from '../../agb-aws-test-deploy/TestStateRepository';
import { TestPollResponse } from '../../agb-aws-test-deploy/TestRunner';
import { DynamoDBClient } from '../../agb-aws-clients';

export enum Scenarios {
  HandlesMessage = 'handles_message',
  HandlesMessageBatch = 'handles_message_batch',
  HandlesMessageBatchError = 'handles_message_batch_error',
}

BaseFunction.Log = log;
SQSFunction.Log = log;
ApiGatewayFunction.Log = log;

const sqsClient = new SQSClient(process.env.SQS_FUNCTION_QUEUE_URL);
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.TEST_TABLE_NAME)
);

export interface TestMessage {
  scenario: string;
  index?: number;
}

// Test starter function

class SQSFunctionTestStarterFunction extends TestStarterFunction {
  //
  async startTestAsync(scenario: string): Promise<void> {
    //
    switch (scenario) {
      //
      case Scenarios.HandlesMessage:
        await sqsClient.sendMessageAsync({ scenario });
        break;

      case Scenarios.HandlesMessageBatch:
      case Scenarios.HandlesMessageBatchError:
        {
          const sendMessagePromises = Array.from(Array(10).keys()).map((index) =>
            sqsClient.sendMessageAsync({ scenario, index })
          );
          await Promise.all(sendMessagePromises);
        }
        break;

      default:
        throw new Error(`Unhandled scenario: ${scenario}`);
    }
  }
}

const sqsFunctionTestStarterFunction = new SQSFunctionTestStarterFunction(testStateRepository);

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    sqsFunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Test poller function

class SQSFunctionTestPollerFunction extends TestPollerFunction {
  //
  async pollTestAsync(scenario: string, scenarioItems: TestStateItem[]): Promise<TestPollResponse> {
    //
    switch (scenario) {
      //
      case Scenarios.HandlesMessage:
        return {
          success: scenarioItems[0].itemData.success === true,
        };

      default:
        throw new Error(`Unhandled scenario: ${scenario}`);
    }
  }
}

const sqsFunctionTestPollerFunction = new SQSFunctionTestPollerFunction(testStateRepository);

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    sqsFunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SQSFunction<TestMessage> {
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    await testStateRepository.putCurrentScenarioItemAsync('Result', { success: true });
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
).use(sqsBatch());
