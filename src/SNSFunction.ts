/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable class-methods-use-this */
// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { SNSEvent } from 'aws-lambda/trigger/sns';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface SNSFunctionProps extends BaseFunctionProps<SNSEvent> {
  handleError?: boolean;
}

export default abstract class SNSFunction<T> extends BaseFunction<SNSEvent, Context, void> {
  //
  props: SNSFunctionProps = {
    handleError: true,
  };

  constructor(props?: SNSFunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(event: SNSEvent): Promise<void> {
    //
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
          this.logError('Error handling event record', { eventRecord }, error);

          try {
            await this.handleErrorAsync(error, message);
          } catch (errorHandlingError) {
            this.logError('Error handling event record error', { eventRecord }, errorHandlingError);
          }
        }
      } else {
        await this.handleMessageAsync(message);
      }
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async handleErrorAsync(error: any, message: T): Promise<void> {}
}
