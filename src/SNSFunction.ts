// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { Context } from 'aws-lambda/handler';
import FunctionLog from './FunctionLog';

export interface SNSFunctionProps<T> {
  handleError?: boolean;
  errorHandlerAsync?: (error: any, message?: T) => Promise<void>;
}

export default abstract class SNSFunction<T> {
  //
  static Log: FunctionLog | undefined;

  props: SNSFunctionProps<T> = {
    handleError: true,
  };

  event: SNSEvent;

  context: Context;

  constructor(props?: SNSFunctionProps<T>) {
    this.props = { ...this.props, ...props };
  }

  async handleAsync(event: SNSEvent, context: Context): Promise<void> {
    //
    if (SNSFunction.Log?.debug) SNSFunction.Log.debug('Handling SNSEvent', { event });

    context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    // eslint-disable-next-line no-restricted-syntax
    for (const eventRecord of event.Records) {
      //
      if (SNSFunction.Log?.debug) SNSFunction.Log.debug('Handling event record', { eventRecord });

      const message = JSON.parse(eventRecord.Sns.Message);

      if (message.Event?.endsWith(':TestEvent')) {
        if (SNSFunction.Log?.info)
          SNSFunction.Log.info('Skipping test event', { messageEvent: message.Event });
        break;
      }

      if (this.props.handleError) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.handleMessageAsync(message);
          //
        } catch (error) {
          //
          if (SNSFunction.Log?.error) {
            SNSFunction.Log.error('Handling event record', { eventRecord }, error);
          } else {
            // eslint-disable-next-line no-console
            console.error(
              `${error.stack}\n\nHandling event record: ${JSON.stringify(eventRecord)}`
            );
          }

          if (this.props.errorHandlerAsync) {
            // eslint-disable-next-line no-await-in-loop
            await this.props.errorHandlerAsync(error, message);
          }
        }
      } else {
        // eslint-disable-next-line no-await-in-loop
        await this.handleMessageAsync(message);
      }
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;
}
