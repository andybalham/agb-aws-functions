// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { Context } from 'aws-lambda/handler';
import FunctionLog from './FunctionLog';

export default abstract class SQSFunction<T> {
  //
  static Log: FunctionLog | undefined;

  event: SQSEvent;

  context: Context;

  async handleAsync(event: SQSEvent, context: Context): Promise<void> {
    //
    context.callbackWaitsForEmptyEventLoop = false;

    if (SQSFunction.Log?.debug) SQSFunction.Log.debug('SQSEvent', { event });

    this.event = event;
    this.context = context;

    // eslint-disable-next-line no-restricted-syntax
    for (const eventRecord of event.Records) {
      //
      if (SQSFunction.Log?.debug) SQSFunction.Log.debug('eventRecord', { eventRecord });

      const message = JSON.parse(eventRecord.body);

      if (message.Event?.endsWith(':TestEvent')) {
        if (SQSFunction.Log?.info)
          SQSFunction.Log.info('Skipping test event', { messageEvent: message.Event });
        break;
      }

      // TODO 28Mar21: Add some optional error handling

      // eslint-disable-next-line no-await-in-loop
      await this.handleMessageAsync(message);
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;
}
