#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import dotenv from 'dotenv';
import { newTestFunction, TestRestApi } from './agb-aws-test';

dotenv.config();

interface SNSFunctionStackProps extends cdk.StackProps {
  testTable: dynamodb.Table;
}

export default class SNSFunctionStack extends cdk.Stack {
  //
  newSNSTestFunction = (args: {
    name: string;
    environment: { [key: string]: string };
  }): lambda.Function =>
    newTestFunction({
      ...args,
      scope: this,
      entry: path.join(__dirname, '.', 'functions', `SNSFunctionTest.fn.ts`),
    });

  constructor(scope: cdk.App, id: string, props: SNSFunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestRestApi(this, 'SNSFunction', {
      testTable: props.testTable,
      testApiKeyValue: process.env.SNS_FUNCTION_API_KEY,
    });

    const testTopic = new sns.Topic(this, 'SNSFunctionTopic', {
      displayName: 'SNSFunction test topic',
    });

    // SnsFunctionTestRunnerFunction

    const snsFunctionTestRunnerFunction = this.newSNSTestFunction({
      name: 'SNSFunctionTestRunner',
      environment: {
        TEST_TABLE_NAME: props.testTable.tableName,
        SNS_FUNCTION_TOPIC_ARN: testTopic.topicArn,
      },
    });

    props.testTable.grantWriteData(snsFunctionTestRunnerFunction);
    testTopic.grantPublish(snsFunctionTestRunnerFunction);

    testApi.addPostFunction({
      path: 'run-test',
      methodFunction: snsFunctionTestRunnerFunction,
    });

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = this.newSNSTestFunction({
      name: 'ReceiveTestMessage',
      environment: {
        TEST_TABLE_NAME: props.testTable.tableName,
      },
    });

    testTopic.addSubscription(new subs.LambdaSubscription(receiveTestMessageFunction));
    props.testTable.grantReadWriteData(receiveTestMessageFunction);
  }
}
