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
import { S3Event, S3EventRecord } from 'aws-lambda';
import { S3Function } from '../../src';
import {
  TestPollerFunction,
  TestPollResponse,
  TestStarterFunction,
  TestStateRepository,
} from '../../agb-aws-test';
import { DynamoDBClient } from '../../agb-aws-clients';

const s3Client = new S3Client(process.env.TEST_BUCKET_NAME);
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.AWS_TEST_STATE_TABLE_NAME)
);

export enum Scenarios {
  HandlesObjectCreated = 'handles_object_created',
  HandlesObjectCreatedBatch = 'handles_object_created_batch',
  HandlesError = 'handles_error',
}

// Test starter function

class S3FunctionTestStarterFunction extends TestStarterFunction {
  constructor() {
    super(testStateRepository, { log });

    this.testParams = {
      [Scenarios.HandlesObjectCreated]: (): Record<string, any> => ({
        instanceId: `Instance-${Date.now()}`,
      }),

      [Scenarios.HandlesObjectCreatedBatch]: (): Record<string, any> => ({
        instanceId: `Instance-${Date.now()}`,
        batchSize: 6,
      }),

      [Scenarios.HandlesError]: (): Record<string, any> => ({
        expectedErrorMessage: 'TEST ERROR',
      }),
    };

    this.tests = {
      [Scenarios.HandlesObjectCreated]: async ({ scenario, params }): Promise<void> =>
        s3Client.putObjectAsync(scenario, { instanceId: params.instanceId }),

      [Scenarios.HandlesObjectCreatedBatch]: async ({ scenario, params }): Promise<any> => {
        const putObjectPromises = Array.from(Array(params.batchSize).keys()).map((index) =>
          s3Client.putObjectAsync(`${scenario}-${index}`, { instanceId: params.instanceId })
        );
        return await Promise.all(putObjectPromises);
      },

      [Scenarios.HandlesError]: async ({ scenario }): Promise<void> =>
        s3Client.putObjectAsync(scenario, {}),
    };
  }
}

const s3FunctionTestStarterFunction = new S3FunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    s3FunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// HandleObjectCreated

class HandleObjectCreatedFunction extends S3Function {
  //
  constructor() {
    super({ log, handleError: true });
  }

  async handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void> {
    //
    const currentScenario = await testStateRepository.getCurrentTestAsync();

    switch (currentScenario.scenario) {
      //
      case Scenarios.HandlesObjectCreated:
      case Scenarios.HandlesObjectCreatedBatch:
        {
          const s3Object = await s3Client.getObjectAsync(eventRecord.s3.object.key);

          await testStateRepository.putTestResultAsync(eventRecord.s3.object.key, {
            instanceId: s3Object.instanceId,
            expectedEventName: eventRecord.eventName.startsWith('ObjectCreated:'),
          });
        }
        break;

      case Scenarios.HandlesError:
        throw new Error(currentScenario.params.expectedErrorMessage);

      default:
        throw new Error(`Unhandled scenario: ${currentScenario.scenario}`);
    }
  }

  async handleErrorAsync(error: any, event: S3Event, eventRecord: S3EventRecord): Promise<void> {
    await super.handleErrorAsync(error, event, eventRecord);
    await testStateRepository.putTestResultAsync('error', {
      errorMessage: error.message,
    });
  }
}

const handleObjectCreatedFunction = new HandleObjectCreatedFunction();

export const handleObjectCreatedHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    handleObjectCreatedFunction.handleAsync(event, context)
);

// Test poller function

class S3FunctionTestPollerFunction extends TestPollerFunction {
  constructor() {
    super(testStateRepository, { log });

    this.tests = {
      [Scenarios.HandlesObjectCreated]: ({ results, params }): TestPollResponse => ({
        success:
          results.length === 1 &&
          results[0].itemData?.instanceId === params.instanceId &&
          results[0].itemData?.expectedEventName,
      }),

      [Scenarios.HandlesObjectCreatedBatch]: ({ results, params }): TestPollResponse => {
        if (results.length < params.batchSize) {
          return {};
        }
        return {
          success: results.every((result) => result.itemData.instanceId === params.instanceId),
        };
      },

      [Scenarios.HandlesError]: ({ results, params }): TestPollResponse => ({
        success:
          results.length === 1 && results[0].itemData?.errorMessage === params.expectedErrorMessage,
      }),
    };
  }
}

const s3FunctionTestPollerFunction = new S3FunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    s3FunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());
