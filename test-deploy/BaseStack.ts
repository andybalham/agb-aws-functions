#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import TestRepository from './common/TestRepository';

export default class BaseStack extends cdk.Stack {
  //
  readonly testTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    //
    super(scope, id, props);

    const testRepository = new TestRepository(this, 'AwsFunctions');

    this.testTable = testRepository.table;
  }
}
