/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { S3Client, SNSClient } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import middyCorrelationIds from '@dazn/lambda-powertools-middleware-correlation-ids';
import log from '@dazn/lambda-powertools-logger';
import { ApiGatewayFunction, SNSFunction } from '../../src';

SNSFunction.Log = log;
ApiGatewayFunction.Log = log;

const snsClient = new SNSClient(process.env.SNS_FUNCTION_TOPIC_ARN);
const s3Client = new S3Client(process.env.SNS_FUNCTION_BUCKET_NAME);

export class TestMessage {
  key: string;

  body: Record<string, any>;
}

// Send test message function

class SendTestMessageFunction extends ApiGatewayFunction<TestMessage, Record<string, never>> {
  async handleRequestAsync(request: TestMessage): Promise<Record<string, never>> {
    await snsClient.publishMessageAsync(request);
    return {};
  }
}

const sendTestMessageFunction = new SendTestMessageFunction();

export const sendTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    sendTestMessageFunction.handleAsync(event, context)
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
