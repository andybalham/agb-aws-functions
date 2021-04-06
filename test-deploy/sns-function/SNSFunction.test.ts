/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import { expect } from 'chai';
import dotenv from 'dotenv';
import { TestRunner } from '../../agb-aws-test';
import { Scenarios } from './SNSFunction.test-fn';

dotenv.config();

const testRunner = new TestRunner({
  baseURL: process.env.SNS_FUNCTION_BASE_URL,
  headers: {
    'x-api-key': process.env.SNS_FUNCTION_API_KEY,
  },
});

describe('SNSFunction integration tests', () => {
  //
  const theories = [
    { scenario: Scenarios.HandlesMessage },
    { scenario: Scenarios.HandlesMessageBatch },
    { scenario: Scenarios.HandlesError },
  ];

  // eslint-disable-next-line no-restricted-syntax
  for (const theory of theories) {
    it(theory.scenario, async () => {
      const { success, message } = await testRunner.runTestAsync(theory.scenario);
      expect(success, message).to.be.true;
    });
  }
});
