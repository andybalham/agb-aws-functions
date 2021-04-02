/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export default class TestStateDynamoDBTable extends dynamodb.Table {
  //
  constructor(scope: cdk.Construct, id: string, tableProps?: dynamodb.TableProps) {
    //
    super(scope, `${id}TestStateTable`, {
      ...tableProps,
      ...{
        // TODO 21Mar21: Could we set a time to live on this?
        partitionKey: { name: 'stack', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'scenarioKey', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      },
    });
  }
}
