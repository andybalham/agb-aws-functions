/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
import { Context } from 'aws-lambda/handler';
import FunctionLog from './FunctionLog';

export default abstract class BaseFunction<TEvent, TResult> {
  //
  static Log: FunctionLog | undefined;

  event: TEvent;

  context: Context;

  async handleAsync(event: TEvent, context: Context): Promise<TResult> {
    //
    if (BaseFunction.Log?.debug) BaseFunction.Log.debug('Handling event', { event });

    context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    return this.handleInternalAsync(event, context);
  }

  protected abstract handleInternalAsync(event: TEvent, context: Context): Promise<TResult>;

  protected logError(message: string, handledData: any, error: any): void {
    if (BaseFunction.Log?.error) {
      BaseFunction.Log.error(message, handledData, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`${error.stack}\n\n${message}: ${JSON.stringify(handledData)}`);
    }
  }
}
