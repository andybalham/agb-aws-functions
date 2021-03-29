/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { DynamoDBClient, SQSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import { ApiGatewayFunction, SQSFunction } from '../../src';
import { TestState, TestReadRequest, TestRunnerFunction } from '../../agb-aws-test-deploy';

SQSFunction.Log = log;
ApiGatewayFunction.Log = log;

const sqsClient = new SQSClient(process.env.SQS_FUNCTION_QUEUE_URL);
const testTableClient = new DynamoDBClient(process.env.TEST_TABLE_NAME);

export class TestMessage {
  testName: string;

  value: string;
}

// Test runner function

class SQSFunctionTestRunnerFunction extends TestRunnerFunction {
  //
  async runTestAsync(testName: string, testInput: Record<string, any>): Promise<void> {
    //
    switch (testName) {
      //
      case 'handles_message':
      case 'throw_error':
        await sqsClient.sendMessageAsync(testInput);
        break;

      default:
        throw new Error(`Unhandled testName: ${testName}`);
    }
  }
}

const sqsFunctionTestRunnerFunction = new SQSFunctionTestRunnerFunction(testTableClient);

export const sqsFunctionTestRunnerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    sqsFunctionTestRunnerFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SQSFunction<TestMessage> {
  //
  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    // eslint-disable-next-line default-case
    switch (message.testName) {
      case 'throw_error':
        throw new Error(`Test error: ${message.value}`);
    }

    const testReadRequest: TestReadRequest = {
      testStack: 'SQSFunction',
      testName: 'handles_message',
    };

    await this.updateTestStateAsync(testReadRequest, message);
  }

  protected async handleErrorAsync(error: any): Promise<void> {
    //
    const testReadRequest: TestReadRequest = {
      testStack: 'SQSFunction',
      testName: 'throw_error',
    };

    await this.updateTestStateAsync(testReadRequest, error.message);
  }

  private async updateTestStateAsync(
    testReadRequest: TestReadRequest,
    actualOutput: any
  ): Promise<void> {
    //
    const testState = await testTableClient.getAsync<TestState>(testReadRequest);

    if (!testState) {
      throw new Error(`Could locate the test state for ${JSON.stringify(testReadRequest)}`);
    }

    await testTableClient.putAsync({ ...testState, actualOutput });
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
);
