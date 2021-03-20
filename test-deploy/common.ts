/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export function newFunction(
  scope: cdk.Construct,
  functionModule: string,
  functionName: string,
  functionEnvironment: { [key: string]: string }
): lambda.Function {
  //
  const functionId = `${functionName}Function`;
  const functionHandler = `${
    functionName.slice(0, 1).toLowerCase() + functionName.slice(1)
  }Handler`;

  return new lambdaNodejs.NodejsFunction(scope, functionId, {
    entry: path.join(__dirname, '.', 'functions', `${functionModule}.ts`),
    handler: functionHandler,
    environment: functionEnvironment,
  });
}
