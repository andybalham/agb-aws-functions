#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import TestApi from './common/TestApi';

interface ApiGatewayFunctionStackProps extends cdk.StackProps {
  testTable: dynamodb.Table;
}

export default class ApiGatewayFunctionStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string, props: ApiGatewayFunctionStackProps) {
    //
    super(scope, id, props);

    const parameterTestFunction = new lambda.NodejsFunction(this, 'ParameterTestFunction', {
      entry: path.join(__dirname, '.', 'functions', 'ApiGatewayTestFunctions.ts'),
      handler: 'parameterTestHandler',
    });

    const testApi = new TestApi(this, 'ApiGatewayFunction', { testTable: props.testTable });

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
