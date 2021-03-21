#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import TestRepository from './common/TestRepository';

export default class BaseStack extends cdk.Stack {
  //
  readonly testBucket: s3.Bucket;

  readonly testTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    //
    super(scope, id, props);

    this.testBucket = new s3.Bucket(this, 'TestBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const testRepository = new TestRepository(this, 'AwsFunctions');

    this.testTable = testRepository.table;
  }
}
