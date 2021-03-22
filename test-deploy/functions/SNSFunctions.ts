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
import { ApiGatewayFunction, SNSFunction } from '../../src';
import { Test, TestReadRequest, TestRunnerFunction } from '../common';

SNSFunction.Log = log;
ApiGatewayFunction.Log = log;

const snsClient = new SNSClient(process.env.SNS_FUNCTION_TOPIC_ARN);
const testTableClient = new DynamoDBClient(process.env.TEST_TABLE_NAME);

export class TestMessage {
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
        await snsClient.publishMessageAsync(testInput);
        break;

      default:
        throw new Error(`Unhandled testName: ${testName}`);
    }
  }
}

const snsFunctionTestRunnerFunction = new SNSFunctionTestRunnerFunction(testTableClient);

export const sNSFunctionTestRunnerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    snsFunctionTestRunnerFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SNSFunction<TestMessage> {
  async handleMessageAsync(message: TestMessage): Promise<void> {
    //
    const testReadRequest: TestReadRequest = {
      testStack: 'SNSFunction',
      testName: 'handles_message',
    };

    const test = await testTableClient.getAsync<Test>(testReadRequest);

    if (!test) {
      throw new Error(`Could locate the test state for ${JSON.stringify(testReadRequest)}`);
    }

    await testTableClient.putAsync({ ...test, actualOutput: message });
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
);
