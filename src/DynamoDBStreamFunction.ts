// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
/* eslint-disable import/no-extraneous-dependencies */
import { Context } from 'aws-lambda/handler';
import { DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import FunctionLog from './FunctionLog';

export default abstract class DynamoDBStreamFunction<T> {
  //
  static Log: FunctionLog | undefined;

  event: DynamoDBStreamEvent;

  context: Context;

  async handleAsync(event: DynamoDBStreamEvent, context: Context): Promise<void> {
    //
    if (DynamoDBStreamFunction.Log?.debug)
      DynamoDBStreamFunction.Log.debug('DynamoDBStreamEvent', { event });

    context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    // TODO 13Mar21: How should we handle errors from processEventRecordAsync?

    // eslint-disable-next-line no-restricted-syntax
    for (const eventRecord of event.Records) {
      //
      if (DynamoDBStreamFunction.Log?.debug)
        DynamoDBStreamFunction.Log.debug('eventRecord', { eventRecord });

      const { eventName } = eventRecord;

      const oldImage =
        eventRecord.dynamodb?.OldImage === undefined
          ? undefined
          : (DynamoDB.Converter.unmarshall(eventRecord.dynamodb.OldImage) as T);

      const newImage =
        eventRecord.dynamodb?.NewImage === undefined
          ? undefined
          : (DynamoDB.Converter.unmarshall(eventRecord.dynamodb.NewImage) as T);

      // eslint-disable-next-line no-await-in-loop
      await this.processEventRecordAsync(eventName, oldImage, newImage);
    }
  }

  abstract processEventRecordAsync(
    eventType?: DynamoDBEventTypes,
    oldImage?: T,
    newImage?: T
  ): Promise<void>;
}

export enum DynamoDBEventType {
  INSERT,
  MODIFY,
  REMOVE,
}

export type DynamoDBEventTypes = keyof typeof DynamoDBEventType;
