// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
/* eslint-disable import/no-extraneous-dependencies */
import { Context } from 'aws-lambda/handler';
import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface DynamoDBStreamFunctionProps extends BaseFunctionProps<DynamoDBStreamEvent> {
  logRecord?: boolean;
}

export default abstract class DynamoDBStreamFunction<T> extends BaseFunction<
  DynamoDBStreamEvent,
  PromiseSettledResult<void>[],
  Context
> {
  //
  props: DynamoDBStreamFunctionProps = {
    logRecord: true,
  };

  constructor(props?: DynamoDBStreamFunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(
    event: DynamoDBStreamEvent
  ): Promise<PromiseSettledResult<void>[]> {
    //
    const recordPromises = event.Records.map((record) =>
      this.processEventRecordInternalAsync(record, event)
    );
    return Promise.allSettled(recordPromises);
    // eslint-disable-next-line no-restricted-syntax
    // for (const record of event.Records) {
    //   // eslint-disable-next-line no-await-in-loop
    //   await this.processEventRecordInternalAsync(record);
    // }
  }

  private async processEventRecordInternalAsync(
    eventRecord: DynamoDBRecord,
    event: DynamoDBStreamEvent
  ): Promise<void> {
    //
    if (this.props.logRecord && this.props.log?.debug)
      this.props.log.debug('Processing record', { eventRecord });

    const { eventName, dynamodb } = eventRecord;

    const oldImage =
      dynamodb?.OldImage === undefined
        ? undefined
        : (DynamoDB.Converter.unmarshall(dynamodb.OldImage) as T);

    const newImage =
      dynamodb?.NewImage === undefined
        ? undefined
        : (DynamoDB.Converter.unmarshall(dynamodb.NewImage) as T);

    try {
      await this.processEventRecordAsync(eventName, oldImage, newImage);
    } catch (error) {
      this.logError('Error processing event record', { eventRecord, event }, error);
      throw error;
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
