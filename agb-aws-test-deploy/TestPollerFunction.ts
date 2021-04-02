/* eslint-disable import/no-extraneous-dependencies */
import { ApiGatewayFunction } from '../src';
import { TestPollRequest, TestPollResponse } from './TestRunner';
import TestStateRepository, { TestStateItem } from './TestStateRepository';

export default abstract class TestPollerFunction extends ApiGatewayFunction<
  TestPollRequest,
  TestPollResponse
> {
  //
  constructor(private testStateRepository: TestStateRepository) {
    super();
  }

  async handleRequestAsync({
    testStack,
    testScenario,
  }: TestPollRequest): Promise<TestPollResponse> {
    //
    const currentScenarioItem = await this.testStateRepository.getCurrentScenarioItemAsync(
      testStack
    );

    const scenarioItems = await this.testStateRepository.getStackScenarioItemsAsync(
      testStack,
      testScenario
    );

    return this.pollTestAsync(testScenario, scenarioItems, currentScenarioItem.itemData);
  }

  abstract pollTestAsync(
    scenario: string,
    scenarioItems: TestStateItem[],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    expectations?: any
  ): Promise<TestPollResponse>;
}
