#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line import/no-extraneous-dependencies
import * as cdk from '@aws-cdk/core';
import { Tags } from '@aws-cdk/core';
import ApiGatewayFunctionStack from './ApiGatewayFunctionStack';
import SNSFunctionStack from './SNSFunctionStack';

const app = new cdk.App();
Tags.of(app).add('package', 'agb-aws-functions');

new ApiGatewayFunctionStack(app, 'ApiGatewayFunctionTest');
new SNSFunctionStack(app, 'SNSFunctionTest');
