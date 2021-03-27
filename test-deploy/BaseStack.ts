#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { TestStateDynamoDBTable } from './agb-aws-test';

export default class BaseStack extends cdk.Stack {
  //
  readonly testTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    //
    super(scope, id, props);

    this.testTable = new TestStateDynamoDBTable(this, 'AwsFunctions');
  }
}
