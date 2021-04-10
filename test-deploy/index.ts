#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line import/no-extraneous-dependencies
import * as cdk from '@aws-cdk/core';
import { Tags } from '@aws-cdk/core';
import ApiGatewayFunctionStack from './apigateway-function/ApiGatewayFunction.test-stack';
import DynamoDBStreamFunctionStack from './dynamodb-function/DynamoDBStreamFunction.test-stack';
import S3FunctionStack from './s3-function/S3Function.test-stack';
import SNSFunctionStack from './sns-function/SNSFunction.test-stack';
import SQSFunctionStack from './sqs-function/SQSFunction.test-stack';

const app = new cdk.App();
Tags.of(app).add('app', 'agb-aws-functions');

const apiGatewayFunctionStack = new ApiGatewayFunctionStack(app, 'ApiGatewayFunctionTest', {});
Tags.of(apiGatewayFunctionStack).add('stack', 'ApiGatewayFunctionTest');

const snsFunctionStack = new SNSFunctionStack(app, 'SNSFunctionTest', {});
Tags.of(snsFunctionStack).add('stack', 'SNSFunctionTest');

const sqsFunctionStack = new SQSFunctionStack(app, 'SQSFunctionTest', {});
Tags.of(sqsFunctionStack).add('stack', 'SQSFunctionTest');

const s3FunctionStack = new S3FunctionStack(app, 'S3FunctionTest', {});
Tags.of(s3FunctionStack).add('stack', 'S3FunctionTest');

const dynamoDBStreamFunctionStack = new DynamoDBStreamFunctionStack(app, 'DynDBStreamFnTest', {});
Tags.of(dynamoDBStreamFunctionStack).add('stack', 'DynDBStreamFnTest');
