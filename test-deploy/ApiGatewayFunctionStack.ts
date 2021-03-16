#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import TestApi from './constructs/TestApi';

export default class ApiGatewayFunctionStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    //
    super(scope, id, props);

    const parameterTestFunction = new lambda.NodejsFunction(this, 'ParameterTestFunction', {
      entry: path.join(__dirname, '.', 'functions', 'ApiGatewayFunctions.ts'),
      handler: 'parameterTestHandler',
    });

    const testApi = new TestApi(this, 'ApiGatewayFunction');

    const methodOptions = {
      apiKeyRequired: true,
    };

    testApi.root
      .addResource('query-string')
      .addMethod('GET', new apigateway.LambdaIntegration(parameterTestFunction), methodOptions);

    testApi.root
      .addResource('path-parameters')
      .addResource('{x}')
      .addResource('{y}')
      .addMethod('GET', new apigateway.LambdaIntegration(parameterTestFunction), methodOptions);

    testApi.root
      .addResource('request-body')
      .addMethod('POST', new apigateway.LambdaIntegration(parameterTestFunction), methodOptions);
  }
}
