#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEvents from '@aws-cdk/aws-lambda-event-sources';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import dotenv from 'dotenv';
import { newTestFunction, TestApi } from '../../agb-aws-test';

dotenv.config();

type DynamoDBStreamFunctionStackProps = cdk.StackProps;

const functionEntry = path.join(__dirname, '.', `DynamoDBStreamFunction.test-fn.ts`);

export default class DynamoDBStreamFunctionStack extends cdk.Stack {
  //
  newDynamoDBTestFunction = (args: {
    name: string;
    environment: { [key: string]: string };
  }): lambda.Function =>
    newTestFunction({
      ...args,
      scope: this,
      entry: functionEntry,
    });

  constructor(scope: cdk.App, id: string, props: DynamoDBStreamFunctionStackProps) {
    //
    super(scope, id, props);

    const awsTestApi = new TestApi(this, 'DynamoDBStreamFunction', {
      testApiKeyValue: process.env.DYNAMODBSTREAM_FUNCTION_API_KEY,
    });

    const testItemTable = new dynamodb.Table(this, 'TestTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Test starter and test poller functions

    const testStarterFunction = awsTestApi.addTestStarterFunction(functionEntry, {
      TEST_ITEM_TABLE_NAME: testItemTable.tableName,
    });

    testItemTable.grantReadWriteData(testStarterFunction);

    awsTestApi.addTestPollerFunction(functionEntry);

    // ProcessEventRecord

    const processEventRecordFunction = this.newDynamoDBTestFunction({
      name: 'ProcessEventRecord',
      environment: {
        AWS_TEST_STATE_TABLE_NAME: awsTestApi.testStateTable.tableName,
        TEST_STATE_TABLE_NAME: testItemTable.tableName,
      },
    });

    processEventRecordFunction.addEventSource(
      new lambdaEvents.DynamoEventSource(testItemTable, {
        enabled: process.env.SQS_ENABLED === 'true',
        startingPosition: lambda.StartingPosition.LATEST,
      })
    );

    testItemTable.grantStreamRead(processEventRecordFunction);
    awsTestApi.testStateTable.grantReadWriteData(processEventRecordFunction);
  }
}
