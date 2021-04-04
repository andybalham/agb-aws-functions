// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { FunctionLog } from './FunctionLog';

export default abstract class AppSyncBatchResolverFunction<TSrc, TRes> {
  //
  static Log: FunctionLog | undefined;

  context: Context;

  async handleAsync(events: any[], context: Context): Promise<any> {
    //
    if (AppSyncBatchResolverFunction.Log?.debug)
      AppSyncBatchResolverFunction.Log.debug('AppSyncResolverFunction.handle', { events });

    context.callbackWaitsForEmptyEventLoop = false;

    this.context = context;

    const results: any[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const event of events) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = (await this.resolveSourceAsync(event.source, event.field)) as TRes;
        results.push({ data: result });
        //
      } catch (error) {
        if (AppSyncBatchResolverFunction.Log?.error)
          AppSyncBatchResolverFunction.Log.error(
            `Error resolving: ${JSON.stringify({ source: event.source, field: event.field })}`,
            error
          );
        results.push({ data: null, errorMessage: error.message, errorType: 'ERROR' });
      }
    }

    if (AppSyncBatchResolverFunction.Log?.debug)
      AppSyncBatchResolverFunction.Log.debug('AppSyncResolverFunction.handle', { results });

    return results;
  }

  abstract resolveSourceAsync(source: TSrc, field?: string): Promise<TRes>;
}
