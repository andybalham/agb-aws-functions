/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { PortmanteauResponse } from '../functions/ApiGatewayFunctions';

dotenv.config();

describe('ApiGatewayFunction integration tests', () => {
  //
  it('GET with query string parameters', async () => {
    //
    const response = await axios.get('query-string-test?x=1&y=2', {
      baseURL: process.env.BASE_URL,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(response.status).to.equal(200);

    expect(response.data.requestId).to.not.be.undefined;
    expect(response.data.correlationId).to.not.be.undefined;

    const portmanteauResponse = response.data as PortmanteauResponse;
    expect(portmanteauResponse.result).to.equal('1+2');
  });
});
