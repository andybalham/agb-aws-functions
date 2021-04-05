/* eslint-disable import/no-extraneous-dependencies */
import { ApiGatewayFunction } from '../src';
import { ApiGatewayFunctionProps } from '../src/ApiGatewayFunction';
import { TestPollRequest, TestPollResponse } from './TestRunner';
import TestStateRepository, { TestStateItem } from './TestStateRepository';

export default abstract class TestPollerFunction extends ApiGatewayFunction<
  TestPollRequest,
  TestPollResponse
> {
  //
  tests: {
    [scenario: string]: (test: {
      scenario: string;
      params: Record<string, any>;
      startTime: number;
      items: TestStateItem[];
    }) => TestPollResponse;
  } = {};

  constructor(private testStateRepository: TestStateRepository, props?: ApiGatewayFunctionProps) {
    super(props);
  }

  async handleRequestAsync({ scenario }: TestPollRequest): Promise<TestPollResponse> {
    //
    const currentTest = await this.testStateRepository.getCurrentTestAsync();

    const currentTestItems = await this.testStateRepository.getTestItemsAsync(scenario);

    if (currentTestItems.length < 1) {
      return {};
    }

    return this.pollTestAsync({ ...currentTest, items: currentTestItems });
  }

  async pollTestAsync(test: {
    scenario: string;
    params: Record<string, any>;
    startTime: number;
    items: TestStateItem[];
  }): Promise<TestPollResponse> {
    //
    const testPoller = this.tests[test.scenario];

    if (testPoller === undefined) throw new Error(`testPoller === undefined for ${test.scenario}`);

    return testPoller(test);
  }
}
