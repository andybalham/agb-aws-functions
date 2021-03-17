#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import TestApi from './constructs/TestApi';

export default class SNSFunctionStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    //
    super(scope, id, props);

    const testTopic = new sns.Topic(this, 'SNSFunctionTopic', {
      displayName: 'SNSFunction test topic',
    });

    const testBucket = new s3.Bucket(this, 'TestBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SendTestMessageFunction

    const sendTestMessageFunction = new lambda.NodejsFunction(this, 'SendTestMessageFunction', {
      entry: path.join(__dirname, '.', 'functions', 'SNSFunctions.ts'),
      handler: 'sendTestMessageHandler',
      environment: {
        SNS_FUNCTION_TOPIC_ARN: testTopic.topicArn,
      },
    });

    testTopic.grantPublish(sendTestMessageFunction);

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = new lambda.NodejsFunction(
      this,
      'ReceiveTestMessageFunction',
      {
        entry: path.join(__dirname, '.', 'functions', 'SNSFunctions.ts'),
        handler: 'receiveTestMessageHandler',
        environment: {
          SNS_FUNCTION_BUCKET_NAME: testBucket.bucketName,
        },
      }
    );

    testTopic.addSubscription(new subs.LambdaSubscription(receiveTestMessageFunction));
    testBucket.grantWrite(receiveTestMessageFunction);

    // RetrieveTestMessageFunction

    const retrieveTestMessageFunction = new lambda.NodejsFunction(
      this,
      'RetrieveTestMessageFunction',
      {
        entry: path.join(__dirname, '.', 'functions', 'SNSFunctions.ts'),
        handler: 'retrieveTestMessageHandler',
        environment: {
          SNS_FUNCTION_BUCKET_NAME: testBucket.bucketName,
        },
      }
    );

    testBucket.grantRead(retrieveTestMessageFunction);

    const testApi = new TestApi(this, 'SNSFunction');

    const methodOptions = {
      apiKeyRequired: true,
    };

    testApi.root
      .addResource('send-message')
      .addMethod('POST', new apigateway.LambdaIntegration(sendTestMessageFunction), methodOptions);

    testApi.root
      .addResource('retrieve-message')
      .addMethod(
        'GET',
        new apigateway.LambdaIntegration(retrieveTestMessageFunction),
        methodOptions
      );
  }
}
