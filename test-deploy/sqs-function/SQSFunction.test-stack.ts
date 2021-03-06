#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as sqs from '@aws-cdk/aws-sqs';
import dotenv from 'dotenv';
import { newTestFunction, TestApi } from '../../agb-aws-test';

dotenv.config();

const isSQSEnabled = process.env.SQS_ENABLED === 'true';

type SQSFunctionStackProps = cdk.StackProps;

const functionEntry = path.join(__dirname, '.', `SQSFunction.test-fn.ts`);

export default class SQSFunctionStack extends cdk.Stack {
  //
  newSQSTestFunction = (args: {
    name: string;
    environment: { [key: string]: string };
  }): lambda.Function =>
    newTestFunction({
      ...args,
      scope: this,
      entry: functionEntry,
    });

  constructor(scope: cdk.App, id: string, props: SQSFunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestApi(this, 'SQSFunction', {
      testApiKeyValue: process.env.SQS_FUNCTION_API_KEY,
    });

    const testDLQ = new sqs.Queue(this, 'SQSFunctionDLQ', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
    });

    const testQueue = new sqs.Queue(this, 'SQSFunctionQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: testDLQ,
      },
    });

    // Test starter and test poller functions

    const testStarterFunction = testApi.addTestStarterFunction(functionEntry, {
      SQS_FUNCTION_QUEUE_URL: testQueue.queueUrl,
    });

    testQueue.grantSendMessages(testStarterFunction);

    testApi.addTestPollerFunction(functionEntry);

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = this.newSQSTestFunction({
      name: 'ReceiveTestMessage',
      environment: {
        AWS_TEST_STATE_TABLE_NAME: testApi.testStateTable.tableName,
      },
    });

    receiveTestMessageFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(testQueue, {
        enabled: isSQSEnabled,
      })
    );

    testApi.testStateTable.grantReadWriteData(receiveTestMessageFunction);

    // DLQTestMessageFunction

    const dlqTestMessageFunction = this.newSQSTestFunction({
      name: 'DLQTestMessage',
      environment: {
        AWS_TEST_STATE_TABLE_NAME: testApi.testStateTable.tableName,
      },
    });

    dlqTestMessageFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(testDLQ, {
        enabled: isSQSEnabled,
      })
    );

    testApi.testStateTable.grantReadWriteData(dlqTestMessageFunction);
  }
}
