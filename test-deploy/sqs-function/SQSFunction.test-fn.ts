/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { SQSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import sqsBatch from '@middy/sqs-partial-batch-failure';
import { SQSFunction } from '../../src';
import {
  TestPollerFunction,
  TestPollResponse,
  TestStarterFunction,
  TestStateRepository,
} from '../../agb-aws-test';
import { DynamoDBClient } from '../../agb-aws-clients';

export enum Scenarios {
  HandlesMessage = 'handles_message',
  HandlesMessageBatch = 'handles_message_batch',
  HandlesMessageBatchError = 'handles_message_batch_error',
}

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
  constructor() {
    super(testStateRepository, { log });

    this.testParams = {
      [Scenarios.HandlesMessageBatch]: (): Record<string, any> => ({ batchSize: 10 }),
      [Scenarios.HandlesMessageBatchError]: (): Record<string, any> => ({ batchSize: 10 }),
    };

    this.tests = {
      //
      [Scenarios.HandlesMessage]: ({ scenario }): Promise<any> =>
        sqsClient.sendMessageAsync({ scenario }),

      [Scenarios.HandlesMessageBatch]: ({ scenario, params }): Promise<any> => {
        const sendMessagePromises = Array.from(Array(params.batchSize).keys()).map((index) =>
          sqsClient.sendMessageAsync({ scenario, index })
        );
        return Promise.all(sendMessagePromises);
      },

      [Scenarios.HandlesMessageBatchError]: ({ scenario, params }): Promise<any> => {
        const sendMessagePromises = Array.from(Array(params.batchSize).keys()).map((index) =>
          sqsClient.sendMessageAsync({ scenario, index })
        );
        return Promise.all(sendMessagePromises);
      },
    };
  }
}

const sqsFunctionTestStarterFunction = new SQSFunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    sqsFunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SQSFunction<TestMessage> {
  //
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

      case Scenarios.HandlesMessageBatchError:
        if (message.index === 7) {
          throw new Error(`Unlucky 7`);
        } else {
          await testStateRepository.putCurrentTestItemAsync(`message-${message.index}`, {
            success: true,
          });
        }
        break;

      default:
        throw new Error(`Unhandled scenario: ${message.scenario}`);
    }
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction({ log });

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
).use(sqsBatch());

// DLQ function

class DLQTestMessageFunction extends SQSFunction<TestMessage> {
  //
  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    await testStateRepository.putCurrentTestItemAsync(`message-${message.index}`, {
      success: false,
    });
  }
}

const dlqTestMessageFunction = new DLQTestMessageFunction({ log });

export const dlqTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    dlqTestMessageFunction.handleAsync(event, context)
).use(sqsBatch());

// Test poller function

class SQSFunctionTestPollerFunction extends TestPollerFunction {
  //
  constructor() {
    super(testStateRepository, { log });

    this.tests = {
      //
      [Scenarios.HandlesMessage]: ({ items }): TestPollResponse => ({
        success: items.length === 1 && items[0].itemData.success === true,
      }),

      [Scenarios.HandlesMessageBatch]: ({ items, params }): TestPollResponse => {
        if (items.length < params.batchSize) {
          return {};
        }
        return {
          success:
            items.length === params.batchSize &&
            items.every((item) => item.itemData.success === true),
        };
      },

      [Scenarios.HandlesMessageBatchError]: ({ items, params }): TestPollResponse => {
        if (items.length < params.batchSize) {
          return {};
        }
        return {
          success:
            items.length === params.batchSize &&
            items.every((item) => item.itemData.success === (item.itemId !== 'message-7')),
        };
      },
    };
  }
}

const sqsFunctionTestPollerFunction = new SQSFunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    sqsFunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());
