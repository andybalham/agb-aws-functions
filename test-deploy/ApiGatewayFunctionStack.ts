#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export default class ApiGatewayFunctionStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    //
    super(scope, id, props);

    const portmanteauFunction = new lambda.NodejsFunction(this, 'GetRequestFunction', {
      entry: path.join(__dirname, '.', 'functions', 'ApiGatewayFunctions.ts'),
      handler: 'portmanteauHandler',
    });

    const api = new apigateway.RestApi(this, 'ApiGatewayFunction', {
      restApiName: 'ApiGatewayFunction Test Service',
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    const apiKey = new apigateway.ApiKey(this, 'ApiKey');

    new apigateway.UsagePlan(this, 'UsagePlan', {
      apiKey,
      apiStages: [{ stage: api.deploymentStage }],
    });

    const getRequestIntegration = new apigateway.LambdaIntegration(portmanteauFunction);
    api.root.addMethod('GET', getRequestIntegration, {
      apiKeyRequired: true,
    }); // GET /

    new cdk.CfnOutput(this, 'ApiKeyID', {
      value: apiKey.keyId,
    });
  }
}
