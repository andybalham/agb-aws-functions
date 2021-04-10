#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import dotenv from 'dotenv';
import { newTestFunction, TestApi } from '../../agb-aws-test';

dotenv.config();

type SNSFunctionStackProps = cdk.StackProps;

const functionEntry = path.join(__dirname, '.', `SNSFunction.test-fn.ts`);

export default class SNSFunctionStack extends cdk.Stack {
  //
  newSNSTestFunction = (args: {
    name: string;
    environment: { [key: string]: string };
  }): lambda.Function =>
    newTestFunction({
      ...args,
      scope: this,
      entry: functionEntry,
    });

  constructor(scope: cdk.App, id: string, props: SNSFunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestApi(this, 'SNSFunction', {
      testApiKeyValue: process.env.SNS_FUNCTION_API_KEY,
    });

    const testTopic = new sns.Topic(this, 'SNSFunctionTopic', {
      displayName: 'SNSFunction test topic',
    });

    // Test starter and test poller functions

    const testStarterFunction = testApi.addTestStarterFunction(functionEntry, {
      SNS_FUNCTION_TOPIC_ARN: testTopic.topicArn,
    });

    testTopic.grantPublish(testStarterFunction);

    testApi.addTestPollerFunction(functionEntry);

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = this.newSNSTestFunction({
      name: 'ReceiveTestMessage',
      environment: {
        AWS_TEST_STATE_TABLE_NAME: testApi.testStateTable.tableName,
      },
    });

    testTopic.addSubscription(new subs.LambdaSubscription(receiveTestMessageFunction));

    testApi.testStateTable.grantReadWriteData(receiveTestMessageFunction);
  }
}
