// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { S3Event, S3EventRecord } from 'aws-lambda/trigger/s3';
import { Context } from 'aws-lambda/handler';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface S3FunctionProps extends BaseFunctionProps<S3Event> {
  handleError?: boolean;
  logRecord?: boolean;
}

export default abstract class S3Function extends BaseFunction<
  S3Event,
  PromiseSettledResult<void>[],
  Context
> {
  //
  props: S3FunctionProps = {
    logRecord: true,
  };

  constructor(props?: S3FunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(event: S3Event): Promise<PromiseSettledResult<void>[]> {
    //
    if ((event as any).Event === 's3:TestEvent') {
      // See https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
      if (this.props.log?.info) this.props.log.info('Skipping test event', { event });
      return [];
    }

    const recordPromises = event.Records.map((record) =>
      this.handleEventRecordInternalAsync(event, record)
    );

    return Promise.allSettled(recordPromises);
  }

  private async handleEventRecordInternalAsync(
    event: S3Event,
    eventRecord: S3EventRecord
  ): Promise<void> {
    //
    if (this.props.logRecord && this.props.log?.debug)
      this.props.log.debug('eventRecord', { eventRecord });

    if (this.props.handleError) {
      try {
        //
        await this.handleEventRecordAsync(eventRecord);
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
      await this.handleEventRecordAsync(eventRecord);
      //
    }

    return this.handleEventRecordAsync(eventRecord);
  }

  abstract handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async handleErrorAsync(error: any, event: S3Event, eventRecord: S3EventRecord): Promise<void> {
    this.logError('Error handling event record', { eventRecord, event }, error);
  }
}
