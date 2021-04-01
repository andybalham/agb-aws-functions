/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { DynamoDBClient, SNSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import { ApiGatewayFunction, BaseFunction, SNSFunction } from '../../src';
import { TestState, TestReadRequest, TestRunnerFunction } from '../../agb-aws-test-deploy';

BaseFunction.Log = log;
ApiGatewayFunction.Log = log;
SNSFunction.Log = log;

const snsClient = new SNSClient(process.env.SNS_FUNCTION_TOPIC_ARN);
const testTableClient = new DynamoDBClient(process.env.TEST_TABLE_NAME);

export class TestMessage {
  testName: string;

  value: string;
}

// Test runner function

class SNSFunctionTestRunnerFunction extends TestRunnerFunction {
  //
  async runTestAsync(testName: string, testInput: Record<string, any>): Promise<void> {
    //
    switch (testName) {
      //
      case 'handles_message':
      case 'throw_error':
        await snsClient.publishMessageAsync(testInput);
        break;

      default:
        throw new Error(`Unhandled testName: ${testName}`);
    }
  }
}

const snsFunctionTestRunnerFunction = new SNSFunctionTestRunnerFunction(testTableClient);

export const snsFunctionTestRunnerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestRunnerFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SNSFunction<TestMessage> {
  //
  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    // eslint-disable-next-line default-case
    switch (message.testName) {
      case 'throw_error':
        throw new Error(`Test error: ${message.value}`);
    }

    const testReadRequest: TestReadRequest = {
      testStack: 'SNSFunction',
      testName: 'handles_message',
    };

    await this.updateTestStateAsync(testReadRequest, message);
  }

  protected async handleErrorAsync(error: any): Promise<void> {
    //
    const testReadRequest: TestReadRequest = {
      testStack: 'SNSFunction',
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
