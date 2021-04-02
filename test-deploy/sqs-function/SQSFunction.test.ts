/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import { expect } from 'chai';
import dotenv from 'dotenv';
import { TestRunner } from '../../agb-aws-test-deploy';
import { Scenarios } from './SQSFunction.test-fn';

dotenv.config();

const testRunner = new TestRunner('SQSFunction', {
  baseURL: process.env.SQS_FUNCTION_BASE_URL,
  headers: {
    'x-api-key': process.env.SQS_FUNCTION_API_KEY,
  },
});

describe('SQSFunction integration tests', () => {
  //
  it.only('receives message', async () => {
    //
    const { success, message } = await testRunner.runTestAsync(Scenarios.ReceivesMessage);
    expect(success, message).to.be.true;
  });
});
