// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import BaseFunction from './BaseFunction';

export default abstract class SQSFunction<T> extends BaseFunction<
  SQSEvent,
  PromiseSettledResult<void>[]
> {
  //
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
      if (SQSFunction.Log?.info) SQSFunction.Log.info('Skipping test event', { message });
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
