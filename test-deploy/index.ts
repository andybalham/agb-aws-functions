#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line import/no-extraneous-dependencies
import * as cdk from '@aws-cdk/core';
import { Tags } from '@aws-cdk/core';
import ApiGatewayFunctionStack from './apigateway-function/ApiGatewayFunction.test-stack';
import S3FunctionStack from './s3-function/S3Function.test-stack';
import SNSFunctionStack from './sns-function/SNSFunction.test-stack';
import SQSFunctionStack from './sqs-function/SQSFunction.test-stack';

const app = new cdk.App();
Tags.of(app).add('package', 'agb-aws-functions');

new ApiGatewayFunctionStack(app, 'ApiGatewayFunctionTest', {});
new SNSFunctionStack(app, 'SNSFunctionTest', {});
new SQSFunctionStack(app, 'SQSFunctionTest', {});
new S3FunctionStack(app, 'S3FunctionTest', {});
