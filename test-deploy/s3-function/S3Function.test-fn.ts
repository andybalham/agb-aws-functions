/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import { S3Client } from '@andybalham/agb-aws-clients';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import { S3EventRecord } from 'aws-lambda';
import { S3Function } from '../../src';
import { TestPollerFunction, TestStarterFunction } from '../../agb-aws-test-deploy';
import TestStateRepository, { TestStateItem } from '../../agb-aws-test-deploy/TestStateRepository';
import { TestPollResponse } from '../../agb-aws-test-deploy/TestRunner';
import { DynamoDBClient } from '../../agb-aws-clients';

const s3Client = new S3Client(process.env.TEST_BUCKET_NAME);
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.TEST_TABLE_NAME)
);

export enum Scenarios {
  HandlesMessage = 'handles_message',
  HandlesMessageBatch = 'handles_message_batch',
  HandlesError = 'handles_error',
}

// Test starter function

class S3FunctionTestStarterFunction extends TestStarterFunction {
  //
  constructor() {
    super(testStateRepository, { log });
  }

  async startTestAsync(scenario: string): Promise<void> {
    //
    await s3Client.putObjectAsync('key', {});

    switch (scenario) {
      //
      default:
        throw new Error(`Unhandled scenario: ${scenario}`);
    }
  }
}

const s3FunctionTestStarterFunction = new S3FunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    s3FunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Receive test message function

class S3TestFunction extends S3Function {
  //
  constructor() {
    super({ log });
  }

  async handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`eventRecord: ${JSON.stringify(eventRecord)}`);
  }
}

const s3TestFunction = new S3TestFunction();

export const receiveTestMessageHandler = middy(
  async (event: any, context: Context): Promise<any> => s3TestFunction.handleAsync(event, context)
);

// Test poller function

class S3FunctionTestPollerFunction extends TestPollerFunction {
  //
  constructor() {
    super(testStateRepository, { log });
  }

  async pollTestAsync(scenario: string, scenarioItems: TestStateItem[]): Promise<TestPollResponse> {
    //
    // eslint-disable-next-line no-console
    console.log(`scenarioItems: ${JSON.stringify(scenarioItems)}`);

    switch (scenario) {
      //
      default:
        throw new Error(`Unhandled scenario: ${scenario}`);
    }
  }
}

const s3FunctionTestPollerFunction = new S3FunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    s3FunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());
