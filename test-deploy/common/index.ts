/* eslint-disable no-await-in-loop */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import axios from 'axios';
import TestApi from './TestApi';
import TestRunnerFunction from './TestRunnerFunction';
import { TestState, TestReadRequest, TestRunRequest } from './TestState';

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

async function runTestAsync({
  testStack,
  testName,
  testInput,
  expectedOutput,
  timeoutSeconds,
  testApiConfig,
}: {
  testStack: string;
  testName: string;
  testInput: any;
  expectedOutput: any;
  timeoutSeconds: number;
  testApiConfig: { baseURL: string | undefined; headers: { 'x-api-key': string | undefined } };
}): Promise<TestReadRequest> {
  //
  const testRunRequest: TestRunRequest = {
    testStack,
    testName,
    testInput,
    expectedOutput,
    timeoutSeconds,
  };

  const runTestResponse = await axios.post('run-test', testRunRequest, testApiConfig);

  if (runTestResponse.status !== 200) {
    throw new Error(`Unexpected runTestResponse.status: ${runTestResponse.status}`);
  }

  return testRunRequest;
}

async function waitAsync(waitSeconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
}

async function pollTestStateAsync(
  testReadRequest: TestReadRequest,
  testApiConfig: { baseURL: string | undefined; headers: { 'x-api-key': string | undefined } }
): Promise<boolean> {
  //
  let testTimedOut = false;
  let testSucceeded = false;

  while (!testTimedOut && !testSucceeded) {
    //
    await waitAsync(1);

    const readTestResponse = await axios.get(
      `test/${testReadRequest.testStack}/${testReadRequest.testName}`,
      testApiConfig
    );

    if (readTestResponse.status !== 200) {
      throw new Error(`Unexpected readTestResponse.status: ${readTestResponse.status}`);
    }

    testTimedOut = Date.now() > readTestResponse.data.timeoutTime;

    const actualOutputJson = JSON.stringify(readTestResponse.data.actualOutput);
    const expectedOutputJson = JSON.stringify(readTestResponse.data.expectedOutput);

    testSucceeded = actualOutputJson === expectedOutputJson;
  }

  return testSucceeded;
}

export {
  newTestFunction,
  runTestAsync,
  pollTestStateAsync,
  waitAsync,
  TestApi,
  TestRunnerFunction,
  TestRunRequest,
  TestReadRequest,
  TestState,
};
