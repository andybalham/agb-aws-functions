#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as sqs from '@aws-cdk/aws-sqs';
import dotenv from 'dotenv';
import { newTestFunction, TestRestApi } from '../../agb-aws-test-deploy';

dotenv.config();

const isSQSEnabled = process.env.SQS_ENABLED === 'true';

type SQSFunctionStackProps = cdk.StackProps;

export default class SQSFunctionStack extends cdk.Stack {
  //
  newSQSTestFunction = (args: {
    name: string;
    environment: { [key: string]: string };
  }): lambda.Function =>
    newTestFunction({
      ...args,
      scope: this,
      entry: path.join(__dirname, '.', `SQSFunction.test-fn.ts`),
    });

  constructor(scope: cdk.App, id: string, props: SQSFunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestRestApi(this, 'SQSFunction', {
      testApiKeyValue: process.env.SQS_FUNCTION_API_KEY,
    });

    const testQueue = new sqs.Queue(this, 'SQSFunctionQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      // TODO 29Mar21: Add a DLQ
      // deadLetterQueue
    });

    // SQSFunctionTestRunnerFunction

    const sqsFunctionTestRunnerFunction = this.newSQSTestFunction({
      name: 'SQSFunctionTestRunner',
      environment: {
        TEST_TABLE_NAME: testApi.testTable.tableName,
        SQS_FUNCTION_QUEUE_URL: testQueue.queueUrl,
      },
    });

    testApi.testTable.grantWriteData(sqsFunctionTestRunnerFunction);
    testQueue.grantSendMessages(sqsFunctionTestRunnerFunction);

    testApi.addPostFunction({
      path: 'run-test',
      methodFunction: sqsFunctionTestRunnerFunction,
    });

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = this.newSQSTestFunction({
      name: 'ReceiveTestMessage',
      environment: {
        TEST_TABLE_NAME: testApi.testTable.tableName,
      },
    });

    receiveTestMessageFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(testQueue, {
        enabled: isSQSEnabled,
      })
    );

    testApi.testTable.grantReadWriteData(receiveTestMessageFunction);
  }
}
