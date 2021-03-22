/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { TestReadRequest, TestRunRequest } from '../common';
import { TestMessage } from '../functions/SNSFunctions';

dotenv.config();

async function runTestAsync({
  testStack,
  testName,
  testInput,
  expectedOutput,
  timeoutSeconds,
  axiosConfig,
}: {
  testStack: string;
  testName: string;
  testInput: TestMessage;
  expectedOutput: { value: string };
  timeoutSeconds: number;
  axiosConfig: { baseURL: string | undefined; headers: { 'x-api-key': string | undefined } };
}): Promise<TestReadRequest> {
  //
  const testRunRequest: TestRunRequest = {
    testStack,
    testName,
    testInput,
    expectedOutput,
    timeoutSeconds,
  };

  const runTestResponse = await axios.post('run-test', testRunRequest, axiosConfig);

  if (runTestResponse.status !== 200) {
    throw new Error(`Unexpected runTestResponse.status: ${runTestResponse.status}`);
  }

  return testRunRequest;
}

async function waitAsync(waitSeconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
}

async function pollTestResultAsync(
  testReadRequest: TestReadRequest,
  axiosConfig: { baseURL: string | undefined; headers: { 'x-api-key': string | undefined } }
): Promise<boolean> {
  //
  let testTimedOut = false;
  let testSucceeded = false;

  while (!testTimedOut && !testSucceeded) {
    //
    await waitAsync(1);

    const readTestResponse = await axios.get(
      `test/${testReadRequest.testStack}/${testReadRequest.testName}`,
      axiosConfig
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

const testStack = 'SNSFunction';

const axiosConfig = {
  baseURL: process.env.SNS_FUNCTION_BASE_URL,
  headers: {
    'x-api-key': process.env.SNS_FUNCTION_API_KEY,
  },
};

describe('SNSFunction integration tests', () => {
  //
  it('receives message', async () => {
    //
    const testInput: TestMessage = {
      value: nanoid(10),
    };

    const testReadRequest = await runTestAsync({
      testStack,
      testName: 'handles_message',
      testInput,
      expectedOutput: { ...testInput },
      timeoutSeconds: 3,
      axiosConfig,
    });

    const testSucceeded = await pollTestResultAsync(testReadRequest, axiosConfig);

    expect(testSucceeded).to.be.true;
  });

  it('handles exception', async () => {
    //
  });
});
