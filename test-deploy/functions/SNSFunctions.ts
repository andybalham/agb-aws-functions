/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { DynamoDBClient, S3Client, SNSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import middyCorrelationIds from '@dazn/lambda-powertools-middleware-correlation-ids';
import log from '@dazn/lambda-powertools-logger';
import { ApiGatewayFunction, SNSFunction } from '../../src';
import { TestRunnerFunction } from '../common';

SNSFunction.Log = log;
ApiGatewayFunction.Log = log;

const snsClient = new SNSClient(process.env.SNS_FUNCTION_TOPIC_ARN);
const s3Client = new S3Client(process.env.SNS_FUNCTION_BUCKET_NAME);
const testTableClient = new DynamoDBClient(process.env.TEST_TABLE_NAME);

export class TestMessage {
  key: string;

  body: Record<string, any>;
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
)
  .use(middyCorrelationIds({ sampleDebugLogRate: 1 }))
  .use(httpErrorHandler());

// Receive test message function

class ReceiveTestMessageFunction extends SNSFunction<TestMessage> {
  async handleMessageAsync(message: TestMessage): Promise<void> {
    await s3Client.putObjectAsync(message.key, message.body);
  }
}

const receiveTestMessageFunction = new ReceiveTestMessageFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    receiveTestMessageFunction.handleAsync(event, context)
);

// Retrieve test message function

class RetrieveTestMessageFunction extends ApiGatewayFunction<{ key: string }, Record<string, any>> {
  async handleRequestAsync(message: { key: string }): Promise<Record<string, any>> {
    const body = (await s3Client.getObjectAsync(message.key)) as Record<string, any>;
    return body;
  }
}

const retrieveTestMessageFunction = new RetrieveTestMessageFunction();

export const retrieveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    retrieveTestMessageFunction.handleAsync(event, context)
)
  .use(middyCorrelationIds({ sampleDebugLogRate: 1 }))
  .use(httpErrorHandler());
