/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { IResource } from '@aws-cdk/aws-apigateway';

export default class TestApi extends cdk.Construct {
  //
  readonly root: IResource;

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, `${id}TestApi`);

    const api = new apigateway.RestApi(this, `${id}ApiGateway`, {
      restApiName: `Test API for ${id}`,
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    this.root = api.root;

    const apiKey = new apigateway.ApiKey(this, `${id}ApiKey`);

    new apigateway.UsagePlan(this, `${id}UsagePlan`, {
      apiKey,
      apiStages: [{ stage: api.deploymentStage }],
    });

    new cdk.CfnOutput(this, `${id}ApiKeyId`, {
      value: apiKey.keyId,
    });
  }
}
