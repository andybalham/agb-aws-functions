#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import dotenv from 'dotenv';
import { TestApi } from '../../agb-aws-test';

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

    const testApi = new TestApi(this, 'ApiGatewayFunction', {
      testApiKeyValue: process.env.API_GATEWAY_FUNCTION_API_KEY,
      testStateTable: false,
    });

    const methodOptions = {
      apiKeyRequired: true,
    };

    testApi.addGetMethodFunction({
      path: 'query-string',
      methodFunction: parameterTestFunction,
      options: methodOptions,
    });

    testApi.addGetMethodFunction({
      path: 'path-parameters/{x}/{y}',
      methodFunction: parameterTestFunction,
      options: methodOptions,
    });

    testApi.addPostMethodFunction({
      path: 'request-body',
      methodFunction: parameterTestFunction,
      options: methodOptions,
    });
  }
}
