/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
import { DynamoDBClient } from '@andybalham/agb-aws-clients';
import { Context } from 'aws-lambda/handler';
import { TestReadRequest, TestReadResponse } from './Test';
import { ApiGatewayFunction } from '../../src';

class TestReaderFunction extends ApiGatewayFunction<TestReadRequest, TestReadResponse | undefined> {
  //
  constructor(private testTableClient: DynamoDBClient) {
    super();
  }

  async handleRequestAsync(request: TestReadRequest): Promise<TestReadResponse | undefined> {
    return this.testTableClient.getAsync<TestReadResponse>(request);
  }
}

const testReaderFunction = new TestReaderFunction(new DynamoDBClient(process.env.TEST_TABLE_NAME));

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const testReaderHandler = async (event: any, context: Context): Promise<any> =>
  testReaderFunction.handleAsync(event, context);
