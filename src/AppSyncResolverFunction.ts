// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { FunctionLog } from './FunctionLog';

export default abstract class AppSyncResolverFunction<TSrc, TRes> {
  //
  static Log: FunctionLog | undefined;

  context: Context;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async handleAsync(event: any, context: Context): Promise<any> {
    //
    if (AppSyncResolverFunction.Log?.debug)
      AppSyncResolverFunction.Log.debug('AppSyncResolverFunction.handle', { event });

    context.callbackWaitsForEmptyEventLoop = false;

    this.context = context;

    const result = await this.resolveSourceAsync(event.source, event.field);

    if (AppSyncResolverFunction.Log?.debug)
      AppSyncResolverFunction.Log.debug('AppSyncResolverFunction.handle', { result });

    return result;
  }

  abstract resolveSourceAsync(source: TSrc, field?: string): Promise<TRes>;
}
