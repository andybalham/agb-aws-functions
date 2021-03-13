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
import { ApiGatewayFunction } from '../../src';

const correlationIdParams = { sampleDebugLogRate: 0.01 };

ApiGatewayFunction.Log = Log;
ApiGatewayFunction.getCorrelationIds = CorrelationIds.get;

export class PortmanteauRequest {
  x: string;

  y: string;
}

export class PortmanteauResponse {
  result: string;
}

class PortmanteauFunction extends ApiGatewayFunction<PortmanteauRequest, PortmanteauResponse> {
  async handleRequestAsync(request: PortmanteauRequest): Promise<PortmanteauResponse> {
    return { result: `${request.x}+${request.y}` };
  }
}

const portmanteauFunction = new PortmanteauFunction();

export const portmanteauHandler = middy(
  async (event: any, context: Context): Promise<any> =>
    portmanteauFunction.handleAsync(event, context)
)
  .use(middyCorrelationIds(correlationIdParams))
  .use(httpErrorHandler());
