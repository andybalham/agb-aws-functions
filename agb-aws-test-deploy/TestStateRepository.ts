/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file

import { DynamoDBClient } from '../agb-aws-clients';

// TODO 02Apr21: We don't need the stack, as we have a table per testing stack
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

  async setStackScenarioAsync(scenario: string, testParams?: any): Promise<void> {
    //
    const previousScenarioItems = await this.getStackScenarioItemsAsync(scenario);

    // eslint-disable-next-line no-restricted-syntax
    for (const previousScenarioItem of previousScenarioItems) {
      // eslint-disable-next-line no-await-in-loop
      await this.testStateClient.deleteAsync({
        scenario: previousScenarioItem.scenario,
        itemId: previousScenarioItem.itemId,
      });
    }

    const currentStackScenario: TestStateItem = {
      scenario: 'current',
      itemId: 'scenario',
      itemData: { scenario, params: testParams },
    };

    await this.testStateClient.putAsync(currentStackScenario);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async putCurrentScenarioItemAsync(itemId: string, itemData?: any): Promise<void> {
    //
    const currentScenarioStateItem = await this.getCurrentScenarioItemAsync();

    const scenarioItem: TestStateItem = {
      scenario: currentScenarioStateItem.itemData.scenario,
      itemId,
      itemData,
    };

    await this.testStateClient.putAsync(scenarioItem);
  }

  public async getCurrentScenarioItemAsync(): Promise<TestStateItem> {
    //
    const currentScenarioStateItem = await this.testStateClient.getAsync<TestStateItem>({
      scenario: 'current',
      itemId: 'scenario',
    });

    if (currentScenarioStateItem === undefined)
      throw new Error('currentScenarioStateItem === undefined');

    return currentScenarioStateItem;
  }

  async getStackScenarioItemsAsync(scenario: string): Promise<TestStateItem[]> {
    return this.testStateClient.queryByPartitionKeyAsync<TestStateItem>(scenario);
  }
}
