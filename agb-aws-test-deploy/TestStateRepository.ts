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

  async setStackScenarioAsync(scenario: string, params: Record<string, any>): Promise<void> {
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
      itemData: { scenario, params },
    };

    await this.testStateClient.putAsync(currentStackScenario);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async putCurrentScenarioItemAsync(itemId: string, itemData?: any): Promise<void> {
    //
    const currentScenario = await this.getCurrentScenarioAsync();

    const scenarioItem: TestStateItem = {
      scenario: currentScenario.name,
      itemId,
      itemData,
    };

    await this.testStateClient.putAsync(scenarioItem);
  }

  public async getCurrentScenarioAsync(): Promise<{
    name: string;
    params: Record<string, any>;
  }> {
    //
    const currentScenarioStateItem = await this.testStateClient.getAsync<TestStateItem>({
      scenario: 'current',
      itemId: 'scenario',
    });

    if (currentScenarioStateItem === undefined)
      throw new Error('currentScenarioStateItem === undefined');

    return {
      name: currentScenarioStateItem.itemData.scenario,
      params: currentScenarioStateItem.itemData.params,
    };
  }

  async getStackScenarioItemsAsync(scenario: string): Promise<TestStateItem[]> {
    return this.testStateClient.queryByPartitionKeyAsync<TestStateItem>(scenario);
  }
}
