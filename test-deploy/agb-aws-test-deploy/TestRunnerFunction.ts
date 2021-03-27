/* eslint-disable import/no-extraneous-dependencies */
import { DynamoDBClient } from '@andybalham/agb-aws-clients';
import { ApiGatewayFunction } from '../../src';
import { TestState, TestRunRequest } from './TestState';

export default abstract class TestRunnerFunction extends ApiGatewayFunction<TestRunRequest, void> {
  //
  constructor(private testTableClient: DynamoDBClient) {
    super();
  }

  async handleRequestAsync(request: TestRunRequest): Promise<void> {
    //
    const startTime = Date.now();
    const timeoutTime = startTime + request.timeoutSeconds * 1000;

    const test: TestState = {
      ...request,
      startTime,
      timeoutTime,
    };

    await this.testTableClient.putAsync(test);

    await this.runTestAsync(request.testName, request.testInput);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  abstract runTestAsync(testName: string, testInput: Record<string, any>): Promise<void>;
}
