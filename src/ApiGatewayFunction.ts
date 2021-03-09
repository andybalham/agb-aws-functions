// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
import { Context } from 'aws-lambda/handler';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';

import createHttpError from 'http-errors';
import FunctionLog from './FunctionLog';
import { HttpStatusCode } from './HttpStatusCode';

export default abstract class ApiGatewayFunction<TReq, TRes> {
  //
  static Log: FunctionLog | undefined;

  static getCorrelationIds?: () => any;

  responseStatusCode = HttpStatusCode.OK;

  includeCorrelationAndRequestIds = true;

  event: APIGatewayProxyEvent;

  context?: Context;

  requestId: string;

  correlationId: string;

  async handleAsync(
    event: APIGatewayProxyEvent,
    context?: Context
  ): Promise<APIGatewayProxyResult> {
    //
    if (ApiGatewayFunction.Log?.debug)
      ApiGatewayFunction.Log.debug('APIGatewayProxyEvent', { event });

    if (context) context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    if (ApiGatewayFunction.getCorrelationIds) {
      const correlationIds = ApiGatewayFunction.getCorrelationIds();
      this.requestId = correlationIds.awsRequestId;
      this.correlationId = correlationIds['x-correlation-id'];
    }

    const request: TReq = this.getRequest(event);

    // TODO 31Oct20: Allow for input schema validation

    try {
      const response = await this.handleRequestAsync(request);

      if (this.includeCorrelationAndRequestIds && response !== undefined) {
        (response as any).correlationId = this.correlationId;
        (response as any).requestId = this.requestId;
      }

      const result = {
        statusCode: this.responseStatusCode,
        body: typeof response !== 'undefined' ? JSON.stringify(response) : JSON.stringify({}),
      };

      // TODO 31Oct20: Allow for output schema validation

      return result;
      //
    } catch (error) {
      //
      if (ApiGatewayFunction.Log?.error)
        ApiGatewayFunction.Log.error('Error handling request', error);

      throw new createHttpError.InternalServerError(
        JSON.stringify({
          message: 'Internal Server Error',
          correlationId: this.correlationId,
          requestId: this.requestId,
        })
      );
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected getRequest(event: APIGatewayProxyEvent): TReq {
    //
    const request = JSON.parse(event.body ?? '{}');

    for (const name in event.pathParameters) {
      request[name] = event.pathParameters[name];
    }

    for (const name in event.queryStringParameters) {
      request[name] = event.queryStringParameters[name];
    }

    return request;
  }

  abstract handleRequestAsync(request: TReq): Promise<TRes>;
}
