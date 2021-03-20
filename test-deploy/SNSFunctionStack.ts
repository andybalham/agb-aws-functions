#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import TestApi from './constructs/TestApi';
import { newFunction } from './common';

interface SNSFunctionStackProps extends cdk.StackProps {
  testBucket: s3.Bucket;
}

export default class SNSFunctionStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string, props: SNSFunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestApi(this, 'SNSFunction');

    const testTopic = new sns.Topic(this, 'SNSFunctionTopic', {
      displayName: 'SNSFunction test topic',
    });

    // SendTestMessageFunction

    const sendTestMessageFunction = this.newSNSTestFunction('SendTestMessage', {
      SNS_FUNCTION_TOPIC_ARN: testTopic.topicArn,
    });

    testTopic.grantPublish(sendTestMessageFunction);

    this.addFunctionMethod(testApi.root, 'send-message', 'POST', sendTestMessageFunction);

    // ReceiveTestMessageFunction

    const receiveTestMessageFunction = this.newSNSTestFunction('ReceiveTestMessage', {
      SNS_FUNCTION_BUCKET_NAME: props.testBucket.bucketName,
    });

    testTopic.addSubscription(new subs.LambdaSubscription(receiveTestMessageFunction));
    props.testBucket.grantWrite(receiveTestMessageFunction);

    // RetrieveTestMessageFunction

    const retrieveTestMessageFunction = this.newSNSTestFunction('RetrieveTestMessage', {
      SNS_FUNCTION_BUCKET_NAME: props.testBucket.bucketName,
    });

    props.testBucket.grantRead(retrieveTestMessageFunction);

    this.addFunctionMethod(testApi.root, 'retrieve-message', 'GET', retrieveTestMessageFunction);
  }

  // eslint-disable-next-line class-methods-use-this
  private addFunctionMethod(
    root: apigateway.IResource,
    path: string,
    httpMethod: string,
    methodFunction: lambda.Function,
    options?: apigateway.MethodOptions
  ): apigateway.Method {
    //
    const methodOptionsWithApiKey = { ...options, apiKeyRequired: true };

    // TODO 20Mar21: Split the path to add multiple resources

    return root
      .addResource(path)
      .addMethod(
        httpMethod,
        new apigateway.LambdaIntegration(methodFunction),
        methodOptionsWithApiKey
      );
  }

  private newSNSTestFunction(
    functionName: string,
    functionEnvironment: { [key: string]: string }
  ): lambda.Function {
    return newFunction(this, 'SNSFunctions', functionName, functionEnvironment);
  }
}
