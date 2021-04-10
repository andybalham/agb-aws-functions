/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import { Context } from 'aws-lambda/handler';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import { DynamoDBStreamFunction } from '../../src';
import {
  TestPollerFunction,
  TestPollResponse,
  TestStarterFunction,
  TestStateRepository,
} from '../../agb-aws-test';
import { DynamoDBClient } from '../../agb-aws-clients';

const dynamodbClient = new DynamoDBClient(process.env.TEST_ITEM_TABLE_NAME, 'id');
const testStateRepository = new TestStateRepository(
  new DynamoDBClient(process.env.AWS_TEST_STATE_TABLE_NAME)
);

export enum Scenarios {
  HandlesInsert = 'handles_insert',
  HandlesModify = 'handles_modify',
  HandlesRemove = 'handles_remove',
}

interface TestItem {
  id: string;
  value: string;
}

// Test starter function

class DynamoDBStreamFunctionTestStarterFunction extends TestStarterFunction {
  //
  constructor() {
    //
    super(testStateRepository, { log });

    const setInstanceId = (): Record<string, any> => ({ instanceId: Date.now().toString() });

    this.testParams = {
      [Scenarios.HandlesInsert]: setInstanceId,
      [Scenarios.HandlesModify]: setInstanceId,
      [Scenarios.HandlesRemove]: setInstanceId,
    };

    this.tests = {
      //
      [Scenarios.HandlesInsert]: async ({ scenario, params }): Promise<any> =>
        dynamodbClient.putAsync({ id: params.instanceId, value: scenario }),

      [Scenarios.HandlesModify]: async ({ scenario, params }): Promise<any> => {
        await dynamodbClient.putAsync({ id: params.instanceId, value: scenario });
        await dynamodbClient.putAsync({ id: params.instanceId, value: `${scenario}-Modified` });
      },

      [Scenarios.HandlesRemove]: async ({ scenario, params }): Promise<any> => {
        await dynamodbClient.putAsync({ id: params.instanceId, value: scenario });
        await dynamodbClient.deleteAsync({ id: params.instanceId });
      },
    };
  }
}

const dynamodbFunctionTestStarterFunction = new DynamoDBStreamFunctionTestStarterFunction();

export const testStarterHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    dynamodbFunctionTestStarterFunction.handleAsync(event, context)
).use(httpErrorHandler());

// Process event record function

class ProcessEventRecordFunction extends DynamoDBStreamFunction<TestItem> {
  //
  constructor() {
    super({ log });
  }

  async processEventRecordAsync(
    eventType?: 'INSERT' | 'MODIFY' | 'REMOVE',
    oldImage?: TestItem,
    newImage?: TestItem
  ): Promise<void> {
    //
    const currentTest = await testStateRepository.getCurrentTestAsync();

    switch (currentTest.scenario) {
      //
      case Scenarios.HandlesInsert:
      case Scenarios.HandlesModify:
        await testStateRepository.putTestResultItemAsync(`${eventType}-${newImage?.id}`, {
          oldImage,
          newImage,
        });
        break;

      case Scenarios.HandlesRemove:
        await testStateRepository.putTestResultItemAsync(`${eventType}-${oldImage?.id}`, {
          oldImage,
          newImage,
        });
        break;

      default:
        throw new Error(`Unhandled scenario: ${currentTest.scenario}`);
    }
  }
}

const processEventRecordFunction = new ProcessEventRecordFunction();

export const processEventRecordHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    processEventRecordFunction.handleAsync(event, context)
);

// Test poller function

class DynamoDBStreamFunctionTestPollerFunction extends TestPollerFunction {
  //
  constructor() {
    //
    super(testStateRepository, { log });

    this.tests = {
      //
      [Scenarios.HandlesInsert]: ({ items, params }): TestPollResponse => ({
        success: items.some(
          (item) =>
            item.itemId === `INSERT-${params.instanceId}` &&
            !item.itemData.oldImage &&
            item.itemData.newImage
        )
          ? true
          : undefined,
      }),

      [Scenarios.HandlesModify]: ({ items, params }): TestPollResponse => ({
        success: items.some(
          (item) =>
            item.itemId === `MODIFY-${params.instanceId}` &&
            item.itemData.oldImage &&
            item.itemData.newImage &&
            item.itemData.oldImage.value !== item.itemData.newImage.value
        )
          ? true
          : undefined,
      }),

      [Scenarios.HandlesRemove]: ({ items, params }): TestPollResponse => ({
        success: items.some(
          (item) =>
            item.itemId === `REMOVE-${params.instanceId}` &&
            item.itemData.oldImage &&
            !item.itemData.newImage
        )
          ? true
          : undefined,
      }),
    };
  }
}

const dynamodbFunctionTestPollerFunction = new DynamoDBStreamFunctionTestPollerFunction();

export const testPollerHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    dynamodbFunctionTestPollerFunction.handleAsync(event, context)
).use(httpErrorHandler());
