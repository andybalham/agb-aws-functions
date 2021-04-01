/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
/* eslint-disable import/prefer-default-export */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import Log from '@dazn/lambda-powertools-logger';
import CorrelationIds from '@dazn/lambda-powertools-correlation-ids';
import middyCorrelationIds from '@dazn/lambda-powertools-middleware-correlation-ids';
import { Context } from 'aws-lambda/handler';
import { ApiGatewayFunction, BaseFunction } from '../../src';

const correlationIdParams = { sampleDebugLogRate: 0.01 };

BaseFunction.Log = Log;
ApiGatewayFunction.Log = Log;
ApiGatewayFunction.getCorrelationIds = CorrelationIds.get;

export class ParameterTestRequest {
  x: string;

  y: string;
}

export class ParameterTestResponse {
  result: string;
}

class ParameterTestFunction extends ApiGatewayFunction<
  ParameterTestRequest,
  ParameterTestResponse
> {
  async handleRequestAsync(request: ParameterTestRequest): Promise<ParameterTestResponse> {
    return { result: `${request.x}+${request.y}` };
  }
}

const parameterTestFunction = new ParameterTestFunction();

export const parameterTestHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    parameterTestFunction.handleAsync(event, context)
)
  .use(middyCorrelationIds(correlationIdParams))
  .use(httpErrorHandler());
