/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export default class TestStateRepositoryConstruct extends cdk.Construct {
  //
  readonly table: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, `${id}TestRepository`);

    // TODO 21Mar21: Could we set a time to live on this?

    this.table = new dynamodb.Table(this, `${id}TestDynamoDB`, {
      partitionKey: { name: 'testStack', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'testName', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }
}
