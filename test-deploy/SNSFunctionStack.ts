#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { newTestFunction, TestApi } from './common';

interface SNSFunctionStackProps extends cdk.StackProps {
  testBucket: s3.Bucket;
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
      entry: path.join(__dirname, '.', 'functions', `SNSFunctions.ts`),
    });

  constructor(scope: cdk.App, id: string, props: SNSFunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestApi(this, 'SNSFunction', { testTable: props.testTable });

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

    // SendTestMessageFunction

    const sendTestMessageFunction = this.newSNSTestFunction({
      name: 'SendTestMessage',
      environment: {
        SNS_FUNCTION_TOPIC_ARN: testTopic.topicArn,
      },
    });

    testTopic.grantPublish(sendTestMessageFunction);

    testApi.addPostFunction({
      path: 'send-message',
      methodFunction: sendTestMessageFunction,
    });

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = this.newSNSTestFunction({
      name: 'ReceiveTestMessage',
      environment: {
        SNS_FUNCTION_BUCKET_NAME: props.testBucket.bucketName,
      },
    });

    testTopic.addSubscription(new subs.LambdaSubscription(receiveTestMessageFunction));

    props.testBucket.grantWrite(receiveTestMessageFunction);

    // RetrieveTestMessageFunction

    const retrieveTestMessageFunction = this.newSNSTestFunction({
      name: 'RetrieveTestMessage',
      environment: {
        SNS_FUNCTION_BUCKET_NAME: props.testBucket.bucketName,
      },
    });

    props.testBucket.grantRead(retrieveTestMessageFunction);

    testApi.addGetFunction({
      path: 'retrieve-message',
      methodFunction: retrieveTestMessageFunction,
    });
  }
}
