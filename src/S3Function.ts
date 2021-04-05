// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { S3Event, S3EventRecord } from 'aws-lambda/trigger/s3';
import { Context } from 'aws-lambda/handler';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export interface S3FunctionProps extends BaseFunctionProps<S3Event> {
  logRecord?: boolean;
}

// TODO 01Apr21: Is there any real need for this function?

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
      this.handleEventRecordInternalAsync(record)
    );

    return Promise.allSettled(recordPromises);
  }

  private handleEventRecordInternalAsync(eventRecord: S3EventRecord): Promise<void> {
    //
    if (this.props.logRecord && this.props.log?.debug)
      this.props.log.debug('eventRecord', { eventRecord });

    return this.handleEventRecordAsync(eventRecord);
  }

  abstract handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void>;
}
