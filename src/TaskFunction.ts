// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { Context } from 'aws-lambda/handler';
import { FunctionLog } from './FunctionLog';

export default abstract class TaskFunction<TReq, TRes> {
  //
  static Log: FunctionLog | undefined;

  context: Context;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async handleAsync(event: any, context: Context): Promise<any> {
    //
    if (TaskFunction.Log?.debug) TaskFunction.Log.debug('TaskFunction.handle', { event });

    context.callbackWaitsForEmptyEventLoop = false;

    this.context = context;

    const response = await this.handleRequestAsync(event);

    if (TaskFunction.Log?.debug) TaskFunction.Log.debug('TaskFunction.handle', { response });

    return response;
  }

  abstract handleRequestAsync(request: TReq): Promise<TRes>;
}
