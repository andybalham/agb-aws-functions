/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface SNSFunctionProps extends BaseFunctionProps<SNSEvent> {
  // Handling errors allows us to shortcut the following: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
  handleError?: boolean;
  logRecord?: boolean;
}

export default abstract class SNSFunction<T> extends BaseFunction<
  SNSEvent,
  PromiseSettledResult<void>[],
  Context
> {
  //
  props: SNSFunctionProps = {
    handleError: true,
    logRecord: true,
  };

  constructor(props?: SNSFunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(event: SNSEvent): Promise<PromiseSettledResult<void>[]> {
    const recordPromises = event.Records.map((record) => this.handleRecordAsync(event, record));
    return Promise.allSettled(recordPromises);
  }

  private async handleRecordAsync(event: SNSEvent, eventRecord: SNSEventRecord): Promise<void> {
    //
    if (this.props.logRecord && this.props.log?.debug)
      this.props.log.debug('Handling event record', { eventRecord });

    const message = JSON.parse(eventRecord.Sns.Message);

    if (message.Event?.endsWith(':TestEvent')) {
      if (this.props.log?.info)
        this.props.log.info('Skipping test event', { messageEvent: message.Event });
      return;
    }

    if (this.props.handleError) {
      try {
        //
        await this.handleMessageAsync(message);
        //
      } catch (error) {
        try {
          await this.handleErrorAsync(error, event, eventRecord);
        } catch (errorHandlingError) {
          this.logError('Error handling error', { event, eventRecord }, errorHandlingError);
        }
      }
    } else {
      //
      await this.handleMessageAsync(message);
      //
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;

  async handleErrorAsync(error: any, event: SNSEvent, eventRecord: SNSEventRecord): Promise<void> {
    this.logError('Error handling event record', { event, eventRecord }, error);
  }
}
