/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import log from '@dazn/lambda-powertools-logger';
import CorrelationIds from '@dazn/lambda-powertools-correlation-ids';
import middyCorrelationIds from '@dazn/lambda-powertools-middleware-correlation-ids';
import { Context } from 'aws-lambda/handler';
import { ApiGatewayFunction } from '../../src';

const correlationIdParams = { sampleDebugLogRate: 0.01 };

export interface ParameterTestRequest {
  x: string;
  y: string;
}

export interface ParameterTestResponse {
  result: string;
}

class ParameterTestFunction extends ApiGatewayFunction<
  ParameterTestRequest,
  ParameterTestResponse
> {
  //
  constructor() {
    super({
      log,
      correlationIdGetter: CorrelationIds.get,
    });
  }

  async handleRequestAsync(request: ParameterTestRequest): Promise<ParameterTestResponse> {
    //
    const x = parseInt(request.x, 10);
    const y = parseInt(request.y, 10);

    if (x + y === 666) {
      throw new Error(`You're the devil in disguise`);
    }

    return { result: `${x + y}` };
  }
}

const parameterTestFunction = new ParameterTestFunction();

export const parameterTestHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    parameterTestFunction.handleAsync(event, context)
)
  .use(middyCorrelationIds(correlationIdParams))
  .use(httpErrorHandler());
