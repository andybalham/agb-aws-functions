#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import dotenv from 'dotenv';
import * as s3Notifications from '@aws-cdk/aws-s3-notifications';
import { newTestFunction, TestRestApi } from '../../agb-aws-test-deploy';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/naming-convention
type s3FunctionStackProps = cdk.StackProps;

const functionEntry = path.join(__dirname, '.', `S3Function.test-fn.ts`);

export default class S3FunctionStack extends cdk.Stack {
  //
  newS3TestFunction = (args: {
    name: string;
    environment: { [key: string]: string };
  }): lambda.Function =>
    newTestFunction({
      ...args,
      scope: this,
      entry: functionEntry,
    });

  constructor(scope: cdk.App, id: string, props: s3FunctionStackProps) {
    //
    super(scope, id, props);

    const testApi = new TestRestApi(this, 'S3Function', {
      testApiKeyValue: process.env.S3_FUNCTION_API_KEY,
    });

    const testBucket = new s3.Bucket(this, 'TestBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Test starter and test poller functions

    const testStarterFunction = testApi.addTestStarterFunction(functionEntry, {
      TEST_BUCKET_NAME: testBucket.bucketName,
    });

    testBucket.grantReadWrite(testStarterFunction);
    testApi.addTestPollerFunction(functionEntry);

    // HandleObjectCreated

    const handleObjectCreatedFunction = this.newS3TestFunction({
      name: 'HandleObjectCreated',
      environment: {
        TEST_TABLE_NAME: testApi.testStateTable.tableName,
        TEST_BUCKET_NAME: testBucket.bucketName,
      },
    });

    testBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(handleObjectCreatedFunction)
    );

    testBucket.grantRead(handleObjectCreatedFunction);
    testApi.testStateTable.grantReadWriteData(handleObjectCreatedFunction);
  }
}
