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
  constructor(private testStateRepository: TestStateRepository, props?: ApiGatewayFunctionProps) {
    super(props);
  }

  async handleRequestAsync({ testScenario }: TestPollRequest): Promise<TestPollResponse> {
    //
    const currentScenarioItem = await this.testStateRepository.getCurrentScenarioItemAsync();

    const scenarioItems = await this.testStateRepository.getStackScenarioItemsAsync(testScenario);

    if (scenarioItems.length < 1) {
      return {};
    }

    return this.pollTestAsync(testScenario, scenarioItems, currentScenarioItem.itemData);
  }

  abstract pollTestAsync(
    scenario: string,
    scenarioItems: TestStateItem[],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    testParams?: any
  ): Promise<TestPollResponse>;
}
