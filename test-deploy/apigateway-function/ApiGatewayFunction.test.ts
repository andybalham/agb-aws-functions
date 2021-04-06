/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { ParameterTestRequest, ParameterTestResponse } from './ApiGatewayFunction.test-fn';

dotenv.config();

describe('ApiGatewayFunction integration tests', () => {
  //
  const axiosConfig = {
    baseURL: process.env.API_GATEWAY_FUNCTION_BASE_URL,
    headers: {
      'x-api-key': process.env.API_GATEWAY_FUNCTION_API_KEY,
    },
  };

  it('GET with query string parameters', async () => {
    //
    const response = await axios.get('query-string?x=1&y=2', axiosConfig);

    expect(response.status).to.equal(200);

    expect(response.data.requestId).to.not.be.undefined;
    expect(response.data.correlationId).to.not.be.undefined;

    const parameterTestResponse = response.data as ParameterTestResponse;
    expect(parameterTestResponse.result).to.equal('3');
  });

  it('GET with path parameters', async () => {
    //
    const response = await axios.get('path-parameters/1/2', axiosConfig);

    expect(response.status).to.equal(200);

    expect(response.data.requestId).to.not.be.undefined;
    expect(response.data.correlationId).to.not.be.undefined;

    const parameterTestResponse = response.data as ParameterTestResponse;
    expect(parameterTestResponse.result).to.equal('3');
  });

  it('POST with request body', async () => {
    //
    const parameterTestRequest: ParameterTestRequest = {
      x: '1',
      y: '2',
    };

    const response = await axios.post('request-body', parameterTestRequest, axiosConfig);

    expect(response.status).to.equal(200);

    expect(response.data.requestId).to.not.be.undefined;
    expect(response.data.correlationId).to.not.be.undefined;

    const parameterTestResponse = response.data as ParameterTestResponse;
    expect(parameterTestResponse.result).to.equal('3');
  });

  it('GET with error', async () => {
    //
    try {
      await axios.get('path-parameters/444/222', axiosConfig);
      expect(false, 'Exception expected').to.be.true;
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data.requestId).to.not.be.undefined;
      expect(error.response.data.correlationId).to.not.be.undefined;
    }
  });
});
