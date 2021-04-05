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
import {
  TestPollerFunction,
  TestPollResponse,
  TestStarterFunction,
  TestStateRepository,
} from '../../agb-aws-test-deploy';
import { DynamoDBClient } from '../../agb-aws-clients';

const s3Client = new S3Client(process.env.TEST_BUCKET_NAME);
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.TEST_TABLE_NAME)
);

export enum Scenarios {
  HandlesObjectCreated = 'handles_object_created',
}

// Test starter function

class S3FunctionTestStarterFunction extends TestStarterFunction {
  constructor() {
    super(testStateRepository, { log });

    this.testParams = {
      [Scenarios.HandlesObjectCreated]: (): Record<string, any> => ({
        instanceId: `Instance-${Date.now()}`,
      }),
    };

    this.tests = {
      [Scenarios.HandlesObjectCreated]: async ({ scenario, params }): Promise<void> =>
        s3Client.putObjectAsync(scenario, { instanceId: params.instanceId }),
    };
  }
}

const s3FunctionTestStarterFunction = new S3FunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    s3FunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Test poller function

class S3FunctionTestPollerFunction extends TestPollerFunction {
  constructor() {
    super(testStateRepository, { log });

    this.tests = {
      [Scenarios.HandlesObjectCreated]: ({ items, params }): TestPollResponse => ({
        success:
          items.length === 1 &&
          items[0].itemId === 'result' &&
          items[0].itemData?.instanceId === params.instanceId &&
          items[0].itemData?.expectedEventName,
      }),
    };
  }
}

const s3FunctionTestPollerFunction = new S3FunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    s3FunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());

// HandleObjectCreated

class HandleObjectCreatedFunction extends S3Function {
  //
  constructor() {
    super({ log });
  }

  async handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void> {
    //
    const currentScenario = await testStateRepository.getCurrentTestAsync();

    switch (currentScenario.scenario) {
      //
      case Scenarios.HandlesObjectCreated:
        {
          const s3Object = await s3Client.getObjectAsync(eventRecord.s3.object.key);

          await testStateRepository.putCurrentTestItemAsync('result', {
            instanceId: s3Object.instanceId,
            expectedEventName: eventRecord.eventName.startsWith('ObjectCreated:'),
          });
        }
        break;

      default:
        throw new Error(`Unhandled scenario: ${currentScenario.scenario}`);
    }
  }
}

const handleObjectCreatedFunction = new HandleObjectCreatedFunction();

export const handleObjectCreatedHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    handleObjectCreatedFunction.handleAsync(event, context)
);
