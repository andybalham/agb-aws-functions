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
  scenarios: {
    [key: string]: (scenarioItems: TestStateItem[], testParams?: any) => TestPollResponse;
  } = {};

  constructor(private testStateRepository: TestStateRepository, props?: ApiGatewayFunctionProps) {
    super(props);
  }

  async handleRequestAsync({ testScenario }: TestPollRequest): Promise<TestPollResponse> {
    //
    const currentScenarioItem = await this.testStateRepository.getCurrentScenarioAsync();

    const scenarioItems = await this.testStateRepository.getStackScenarioItemsAsync(testScenario);

    if (scenarioItems.length < 1) {
      return {};
    }

    return this.pollTestAsync(testScenario, scenarioItems, currentScenarioItem.params);
  }

  async pollTestAsync(
    scenario: string,
    scenarioItems: TestStateItem[],
    testParams: Record<string, any>
  ): Promise<TestPollResponse> {
    //
    const scenarioHandler = this.scenarios[scenario];

    if (scenarioHandler === undefined) throw new Error('scenarioHandler === undefined');

    return scenarioHandler(scenarioItems, testParams);
  }
}
