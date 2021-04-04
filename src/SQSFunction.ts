// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { SQSEvent, SQSRecord } from 'aws-lambda/trigger/sqs';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface SQSFunctionProps extends BaseFunctionProps<SQSEvent> {
  logRecord?: boolean;
}

export default abstract class SQSFunction<T> extends BaseFunction<
  SQSEvent,
  PromiseSettledResult<void>[],
  Context
> {
  //
  props: SQSFunctionProps = {
    logRecord: true,
  };

  constructor(props?: SQSFunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  async handleInternalAsync(event: SQSEvent): Promise<PromiseSettledResult<void>[]> {
    const recordPromises = event.Records.map((record) => this.handleMessageInternalAsync(record));
    return Promise.allSettled(recordPromises);
  }

  private async handleMessageInternalAsync(record: SQSRecord): Promise<void> {
    //
    if (this.props.logRecord && this.props.log?.debug)
      this.props.log.debug('Handling event record', { record });

    const message = JSON.parse(record.body);

    if ((message as any).Event?.endsWith(':TestEvent')) {
      if (this.props.log?.info) this.props.log.info('Skipping test event', { message });
      return;
    }

    try {
      await this.handleMessageAsync(message);
    } catch (error) {
      this.logError('Error handling message', { message }, error);
      throw error;
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;
}
