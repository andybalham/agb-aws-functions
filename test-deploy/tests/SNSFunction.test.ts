/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { TestRequest } from '../common';
import { TestMessage } from '../functions/SNSFunctions';

dotenv.config();

async function waitAsync(waitSeconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
}

describe('SNSFunction integration tests', () => {
  //
  const axiosConfig = {
    baseURL: process.env.SNS_FUNCTION_BASE_URL,
    headers: {
      'x-api-key': process.env.SNS_FUNCTION_API_KEY,
    },
  };

  it('receives message', async () => {
    //
    const testMessage: TestMessage = {
      key: nanoid(10),
      body: { myNumber: 666 },
    };

    // TODO 21Mar21: Do we have a single function for all tests?

    // const sendResponse = await axios.post('send-message', testMessage, axiosConfig);

    const testRequest: TestRequest = {
      testStack: 'SNSFunction',
      testName: 'handles_message',
      testInput: testMessage,
      expectedOutput: testMessage,
      timeoutSeconds: 3,
    };

    const sendResponse = await axios.post('run-test', testRequest, axiosConfig);

    expect(sendResponse.status).to.equal(200);

    let testTimedOut = false;
    let testSucceeded = false;

    while (!testTimedOut && !testSucceeded) {
      // eslint-disable-next-line no-await-in-loop
      await waitAsync(1);

      // eslint-disable-next-line no-await-in-loop
      const readTestResponse = await axios.get(
        `test/${testRequest.testStack}/${testRequest.testName}`,
        axiosConfig
      );

      testTimedOut = Date.now() > readTestResponse.data.timeoutTime;

      testSucceeded =
        JSON.stringify(readTestResponse.data.actualOutput) ===
        JSON.stringify(readTestResponse.data.expectedOutput);
    }

    const retrieveResponse = await axios.get(
      `retrieve-message?key=${testMessage.key}`,
      axiosConfig
    );

    expect(retrieveResponse.status).to.equal(200);

    expect(retrieveResponse.data).to.deep.equal(testMessage.body);
  });

  it('handles exception', async () => {
    //
  });
});
