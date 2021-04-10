import { DynamoDBClient } from '../agb-aws-clients';

export interface TestStateItem {
  scenario: string;
  itemId: string;
  itemData: any;
}

export default class TestStateRepository {
  //
  constructor(private testStateClient: DynamoDBClient) {
    this.testStateClient.partitionKeyName = 'scenario';
    this.testStateClient.sortKeyName = 'itemId';
  }

  async setCurrentTestAsync(scenario: string, params: Record<string, any>): Promise<void> {
    //
    const previousScenarioItems = await this.getTestItemsAsync(scenario);

    await Promise.all(
      previousScenarioItems.map((item) =>
        this.testStateClient.deleteAsync({
          scenario: item.scenario,
          itemId: item.itemId,
        })
      )
    );

    const currentTest: TestStateItem = {
      scenario: 'current',
      itemId: 'scenario',
      itemData: { scenario, params, startTime: Date.now() },
    };

    await this.testStateClient.putAsync(currentTest);
  }

  async putTestResultItemAsync(itemId: string, itemData?: Record<string, any>): Promise<void> {
    //
    const currentTest = await this.getCurrentTestAsync();

    const scenarioItem: TestStateItem = {
      scenario: currentTest.scenario,
      itemId,
      itemData,
    };

    await this.testStateClient.putAsync(scenarioItem);
  }

  public async getCurrentTestAsync(): Promise<{
    scenario: string;
    params: Record<string, any>;
    startTime: number;
  }> {
    //
    const currentScenarioStateItem = await this.testStateClient.getAsync<TestStateItem>({
      scenario: 'current',
      itemId: 'scenario',
    });

    if (currentScenarioStateItem === undefined)
      throw new Error('currentScenarioStateItem === undefined');

    return {
      scenario: currentScenarioStateItem.itemData.scenario,
      params: currentScenarioStateItem.itemData.params,
      startTime: currentScenarioStateItem.itemData.startTime,
    };
  }

  async getTestItemsAsync(scenario: string): Promise<TestStateItem[]> {
    return this.testStateClient.queryByPartitionKeyAsync<TestStateItem>(scenario);
  }
}
