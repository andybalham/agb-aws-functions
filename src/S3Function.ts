// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { S3Event, S3EventRecord } from 'aws-lambda/trigger/s3';
import { Context } from 'aws-lambda/handler';
import BaseFunction, { BaseFunctionProps } from './BaseFunction';

export type S3FunctionProps = BaseFunctionProps<S3Event>;

// TODO 01Apr21: Is there any real need for this function?

export default abstract class S3Function extends BaseFunction<S3Event, void, Context> {
  //
  props: S3FunctionProps = {};

  constructor(props?: S3FunctionProps) {
    super(props);
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(event: S3Event): Promise<void> {
    //
    // eslint-disable-next-line no-restricted-syntax
    for (const record of event.Records) {
      //
      if (this.props.log?.debug) this.props.log.debug('eventRecord', { eventRecord: record });

      // TODO 25Nov20: Is there a test event from S3? Yes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html

      // eslint-disable-next-line no-await-in-loop
      await this.handleEventRecordAsync(record);
    }
  }

  abstract handleEventRecordAsync(eventRecord: S3EventRecord): Promise<void>;
}
