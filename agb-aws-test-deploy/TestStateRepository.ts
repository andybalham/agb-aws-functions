/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import { DynamoDBClient } from '@andybalham/agb-aws-clients';

// TODO 02Apr21: We don't need the stack, as we have a table per testing stack
export interface TestStateItem {
  stack: string;
  scenarioKey: string;
  scenario: string;
  itemId: string;
  itemData: any;
}

export default class TestStateRepository {
  //
  constructor(private testStateClient: DynamoDBClient) {}

  async setStackScenarioAsync(stack: string, scenario: string, expectations?: any): Promise<void> {
    //
    const previousScenarioItems = await this.getStackScenarioItemsAsync(stack, scenario);

    // eslint-disable-next-line no-restricted-syntax
    for (const previousScenarioItem of previousScenarioItems) {
      //
      const params = {
        TableName: this.testStateClient.tableName ?? 'undefined',
        Key: {
          stack: previousScenarioItem.stack,
          scenarioKey: previousScenarioItem.scenarioKey,
        },
      };
      // eslint-disable-next-line no-await-in-loop
      await this.testStateClient.documentClient.delete(params).promise();
    }

    const currentStackScenario: TestStateItem = {
      stack,
      scenarioKey: 'scenario|current',
      scenario,
      itemId: 'expectations',
      itemData: expectations,
    };

    await this.testStateClient.putAsync(currentStackScenario);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async putCurrentScenarioItemAsync(stack: string, itemId: string, itemData?: any): Promise<void> {
    //
    const currentScenarioStateItem = await this.getCurrentScenarioItemAsync(stack);

    const { scenario } = currentScenarioStateItem;

    const scenarioItem: TestStateItem = {
      stack,
      scenarioKey: `${scenario}|${itemId}`,
      scenario,
      itemId,
      itemData,
    };

    await this.testStateClient.putAsync(scenarioItem);
  }

  public async getCurrentScenarioItemAsync(stack: string): Promise<TestStateItem> {
    //
    const currentScenarioStateItem = await this.testStateClient.getAsync<TestStateItem>({
      stack,
      scenarioKey: 'scenario|current',
    });

    if (currentScenarioStateItem === undefined)
      throw new Error('currentScenarioStateItem === undefined');

    return currentScenarioStateItem;
  }

  async getStackScenarioItemsAsync(stack: string, scenario: string): Promise<TestStateItem[]> {
    //
    const params = {
      TableName: this.testStateClient.tableName ?? 'undefined',
      KeyConditionExpression: 'stack = :stack and begins_with(scenarioKey, :scenario)',
      ExpressionAttributeValues: {
        ':stack': stack,
        ':scenario': scenario,
      },
    };

    const queryOutput = await this.testStateClient.documentClient.query(params).promise();

    return queryOutput.Items?.map((i) => i as TestStateItem) ?? [];
  }
}
