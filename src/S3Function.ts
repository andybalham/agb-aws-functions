// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { S3Event, S3EventRecord } from 'aws-lambda/trigger/s3';
import { Context } from 'aws-lambda/handler';
import FunctionLog from './FunctionLog';

export default abstract class S3Function {
  //
  static Log: FunctionLog | undefined;

  event: S3Event;

  context: Context;

  async handleAsync(event: S3Event, context: Context): Promise<void> {
    //
    if (S3Function.Log?.debug) S3Function.Log.debug('S3Event', { event });

    if (context) context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    // eslint-disable-next-line no-restricted-syntax
    for (const eventRecord of event.Records) {
      //
      if (S3Function.Log?.debug) S3Function.Log.debug('eventRecord', { eventRecord });

      // TODO 25Nov20: Is there a test event from S3?

      // eslint-disable-next-line no-await-in-loop
      await this.handleEventRecordAsync(eventRecord);
    }
  }

  abstract handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void>;
}
