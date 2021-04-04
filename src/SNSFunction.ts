/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface SNSFunctionProps extends BaseFunctionProps<SNSEvent> {
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
    const recordPromises = event.Records.map((record) => this.handleRecordAsync(record));
    return Promise.allSettled(recordPromises);
  }

  private async handleRecordAsync(eventRecord: SNSEventRecord): Promise<void> {
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
          await this.handleErrorAsync(error, message);
        } catch (errorHandlingError) {
          this.logError('Error handling error', { message }, errorHandlingError);
        }
      }
    } else {
      //
      await this.handleMessageAsync(message);
      //
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;

  protected async handleErrorAsync(error: any, message: T): Promise<void> {
    this.logError('Error handling message', { message }, error);
  }
}
