/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
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

    const sendResponse = await axios.post('send-message', testMessage, axiosConfig);

    expect(sendResponse.status).to.equal(200);

    await waitAsync(2);

    const retrieveResponse = await axios.get(
      `retrieve-message?key=${testMessage.key}`,
      axiosConfig
    );

    expect(retrieveResponse.status).to.equal(200);

    expect(retrieveResponse.data).to.deep.equal(testMessage.body);
  });
});
