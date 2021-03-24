/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable class-methods-use-this */
// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import { Context } from 'aws-lambda/handler';
import FunctionLog from './FunctionLog';

export interface SNSFunctionProps {
  handleError?: boolean;
}

export default abstract class SNSFunction<T> {
  //
  static Log: FunctionLog | undefined;

  props: SNSFunctionProps = {
    handleError: true,
  };

  event: SNSEvent;

  context: Context;

  constructor(props?: SNSFunctionProps) {
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
          //
          await this.handleMessageAsync(message);
          //
        } catch (error) {
          //
          this.logError('Error handling event record', eventRecord, error);

          try {
            await this.handleErrorAsync(error, message);
          } catch (errorHandlingError) {
            this.logError('Error handling event record', eventRecord, errorHandlingError);
          }
        }
      } else {
        await this.handleMessageAsync(message);
      }
    }
  }

  private logError(message: string, eventRecord: SNSEventRecord, error: any): void {
    if (SNSFunction.Log?.error) {
      SNSFunction.Log.error(message, { eventRecord }, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`${error.stack}\n\n${message}: ${JSON.stringify(eventRecord)}`);
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async handleErrorAsync(error: any, message: T): Promise<void> {}
}
