#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import dotenv from 'dotenv';
import TestRestApi from '../agb-aws-test-deploy/TestRestApi';

dotenv.config();

type ApiGatewayFunctionStackProps = cdk.StackProps;

export default class ApiGatewayFunctionStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string, props: ApiGatewayFunctionStackProps) {
    //
    super(scope, id, props);

    const parameterTestFunction = new lambda.NodejsFunction(this, 'ParameterTestFunction', {
      entry: path.join(__dirname, '.', 'ApiGatewayFunction.test-fn.ts'),
      handler: 'parameterTestHandler',
    });

    const testApi = new TestRestApi(this, 'ApiGatewayFunction', {
      testApiKeyValue: process.env.API_GATEWAY_FUNCTION_API_KEY,
    });

    const methodOptions = {
      apiKeyRequired: true,
    };

    testApi.apiRoot
      .addResource('query-string')
      .addMethod('GET', new apigateway.LambdaIntegration(parameterTestFunction), methodOptions);

    testApi.apiRoot
      .addResource('path-parameters')
      .addResource('{x}')
      .addResource('{y}')
      .addMethod('GET', new apigateway.LambdaIntegration(parameterTestFunction), methodOptions);

    testApi.apiRoot
      .addResource('request-body')
      .addMethod('POST', new apigateway.LambdaIntegration(parameterTestFunction), methodOptions);
  }
}
