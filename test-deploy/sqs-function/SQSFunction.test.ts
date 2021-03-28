/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import { expect } from 'chai';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { pollTestStateAsync, runTestAsync } from '../../agb-aws-test-deploy';
import { TestMessage } from './SQSFunction.test-fn';

dotenv.config();

const testStack = 'SQSFunction';

const testApiConfig = {
  baseURL: process.env.SQS_FUNCTION_BASE_URL,
  headers: {
    'x-api-key': process.env.SQS_FUNCTION_API_KEY,
  },
};

describe('SQSFunction integration tests', () => {
  //
  it('receives message', async () => {
    //
    const testInput: TestMessage = {
      testName: 'handles_message',
      value: nanoid(10),
    };

    const testReadRequest = await runTestAsync({
      testStack,
      testName: testInput.testName,
      testInput,
      expectedOutput: { ...testInput },
      timeoutSeconds: 3,
      testApiConfig,
    });

    const testSucceeded = await pollTestStateAsync(testReadRequest, testApiConfig);

    expect(testSucceeded).to.be.true;
  });

  it('handles error', async () => {
    //
    const testInput: TestMessage = {
      testName: 'throw_error',
      value: nanoid(10),
    };

    const testReadRequest = await runTestAsync({
      testStack,
      testName: testInput.testName,
      testInput,
      expectedOutput: `Test error: ${testInput.value}`,
      timeoutSeconds: 3,
      testApiConfig,
    });

    const testSucceeded = await pollTestStateAsync(testReadRequest, testApiConfig);

    expect(testSucceeded).to.be.true;
  });
});
