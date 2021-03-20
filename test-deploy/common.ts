/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export function newTestFunction({
  scope,
  module,
  name,
  environment,
}: {
  scope: cdk.Construct;
  module: string;
  name: string;
  environment: { [key: string]: string };
}): lambda.Function {
  //
  const functionId = `${name}Function`;
  const functionHandler = `${name.slice(0, 1).toLowerCase() + name.slice(1)}Handler`;

  return new lambdaNodejs.NodejsFunction(scope, functionId, {
    entry: path.join(__dirname, '.', 'functions', `${module}.ts`),
    handler: functionHandler,
    environment,
  });
}
