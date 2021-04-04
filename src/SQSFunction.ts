// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export type SQSFunctionProps = BaseFunctionProps<SQSEvent>;

export default abstract class SQSFunction<T> extends BaseFunction<
  SQSEvent,
  PromiseSettledResult<void>[],
  Context
> {
  //
  props: SQSFunctionProps = {};

  constructor(props?: SQSFunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  async handleInternalAsync(event: SQSEvent): Promise<PromiseSettledResult<void>[]> {
    //
    const recordPromises = event.Records.map(async (record) => {
      const message = JSON.parse(record.body);
      await this.handleMessageInternalAsync(message);
    });

    return Promise.allSettled(recordPromises);
  }

  private async handleMessageInternalAsync(message: T): Promise<void> {
    //
    if ((message as any).Event?.endsWith(':TestEvent')) {
      if (this.baseProps.log?.info) this.baseProps.log.info('Skipping test event', { message });
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
