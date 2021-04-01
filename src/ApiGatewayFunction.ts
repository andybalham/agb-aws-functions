// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
import { Context } from 'aws-lambda/handler';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';

import createHttpError from 'http-errors';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';
import { HttpStatusCode } from './HttpStatusCode';

export interface ApiGatewayFunctionProps extends BaseFunctionProps<APIGatewayProxyEvent> {
  responseStatusCode?: HttpStatusCode;
  includeCorrelationAndRequestIds?: boolean;
}

export default abstract class ApiGatewayFunction<TReq, TRes> extends BaseFunction<
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult
> {
  //
  static getCorrelationIds?: () => any;

  requestId: string;

  correlationId: string;

  props: ApiGatewayFunctionProps = {
    includeCorrelationAndRequestIds: true,
  };

  constructor(props?: ApiGatewayFunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    //
    if (ApiGatewayFunction.getCorrelationIds) {
      const correlationIds = ApiGatewayFunction.getCorrelationIds();
      this.requestId = correlationIds.awsRequestId;
      this.correlationId = correlationIds['x-correlation-id'];
    }

    const request: TReq = this.getRequest(event);

    // TODO 31Oct20: Allow for input schema validation

    try {
      const response = await this.handleRequestAsync(request);

      if (this.props.includeCorrelationAndRequestIds && response !== undefined) {
        (response as any).correlationId = this.correlationId;
        (response as any).requestId = this.requestId;
      }

      const result = {
        statusCode: this.props.responseStatusCode ?? HttpStatusCode.OK,
        body: typeof response !== 'undefined' ? JSON.stringify(response) : JSON.stringify({}),
      };

      // TODO 31Oct20: Allow for output schema validation

      return result;
      //
    } catch (error) {
      //
      this.logError('Error handling request', event, error);

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
