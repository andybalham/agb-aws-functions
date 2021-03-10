/* eslint-disable import/no-extraneous-dependencies */
import { Construct } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

/* eslint-disable import/prefer-default-export */
export const newFunction = (
  scope: Construct,
  id: string,
  handler: string,
  environment?: {
    [key: string]: string;
  }
): lambda.Function =>
  new lambda.Function(scope, id, {
    runtime: lambda.Runtime.NODEJS_12_X,
    code: lambda.Code.fromAsset('dist'),
    handler: `test-deploy/functions/${handler}`,
    environment,
  });
