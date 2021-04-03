// eslint-disable-next-line import/no-extraneous-dependencies
import { DynamoDBClient } from '@andybalham/agb-aws-clients';

export default class DynamoDBClientExt extends DynamoDBClient {
  //
  async deleteAsync(key: { [key: string]: any }): Promise<void> {
    //
    if (this.tableName === undefined) throw new Error('this.tableName === undefined');

    const params = {
      TableName: this.tableName,
      Key: key,
    };

    await this.documentClient.delete(params).promise();
  }

  async queryBySortKeyPrefixAsync<T>(
    partitionKeyValue: string,
    sortKeyValue: string
  ): Promise<T[]> {
    //
    if (this.tableName === undefined) throw new Error('this.tableName === undefined');
    if (this.partitionKeyName === undefined) throw new Error('this.partitionKeyName === undefined');
    if (this.sortKeyName === undefined) throw new Error('this.sortKeyName === undefined');

    // If we use QueryInput, then we get a 'Condition parameter type does not match schema type'
    const queryParams /*: QueryInput */ = {
      TableName: this.tableName,
      KeyConditionExpression: `${this.partitionKeyName} = :partitionKey and begins_with(${this.sortKeyName}, :sortKeyPrefix)`,
      ExpressionAttributeValues: {
        ':partitionKey': partitionKeyValue,
        ':sortKeyPrefix': sortKeyValue,
      },
    };

    const queryOutput = await this.documentClient.query(queryParams).promise();

    if (!queryOutput.Items) {
      return [];
    }

    return queryOutput.Items.map((i) => i as T);
  }
}
