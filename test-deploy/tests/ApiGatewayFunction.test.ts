/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { ParameterTestRequest, ParameterTestResponse } from '../functions/ApiGatewayTest.fn';

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
    expect(parameterTestResponse.result).to.equal('1+2');
  });

  it('GET with path parameters', async () => {
    //
    const response = await axios.get('path-parameters/1/2', axiosConfig);

    expect(response.status).to.equal(200);

    expect(response.data.requestId).to.not.be.undefined;
    expect(response.data.correlationId).to.not.be.undefined;

    const parameterTestResponse = response.data as ParameterTestResponse;
    expect(parameterTestResponse.result).to.equal('1+2');
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
    expect(parameterTestResponse.result).to.equal('1+2');
  });
});
