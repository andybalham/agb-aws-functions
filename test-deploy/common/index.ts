/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import TestApi from './TestApi';
import TestRunnerFunction from './TestRunnerFunction';
import { Test, TestReadRequest, TestRunRequest } from './Test';

const newTestFunction = ({
  scope,
  entry,
  name,
  environment,
}: {
  scope: cdk.Construct;
  entry: string;
  name: string;
  environment: { [key: string]: string };
}): lambda.Function => {
  //
  const id = `${name}Function`;
  const handler = `${name.slice(0, 1).toLowerCase() + name.slice(1)}Handler`;

  return new lambdaNodejs.NodejsFunction(scope, id, {
    entry,
    handler,
    environment,
  });
};

export { newTestFunction, TestApi, TestRunnerFunction, TestRunRequest, TestReadRequest, Test };
