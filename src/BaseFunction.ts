/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
import FunctionLog from './FunctionLog';

export interface BaseFunctionProps<TEvent> {
  logEvent?: boolean;
  eventLogger?: (event: TEvent) => void;
}

export interface IContext {
  callbackWaitsForEmptyEventLoop: boolean;
}

export default abstract class BaseFunction<TEvent, TResult, TContext extends IContext> {
  //
  static Log: FunctionLog | undefined;

  event: TEvent;

  context?: TContext;

  baseProps: BaseFunctionProps<TEvent> = {
    logEvent: true,
    eventLogger: (event) => {
      if (BaseFunction.Log?.debug) {
        BaseFunction.Log.debug('Handling event', { event });
      } else {
        // eslint-disable-next-line no-console
        console.log(`Handling event: ${JSON.stringify({ event })}`);
      }
    },
  };

  constructor(props?: BaseFunctionProps<TEvent>) {
    this.baseProps = { ...this.baseProps, ...props };
  }

  async handleAsync(event: TEvent, context?: TContext): Promise<TResult> {
    //
    if (this.baseProps.logEvent && this.baseProps.eventLogger) {
      this.baseProps.eventLogger(event);
    }

    if (context) context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    return this.handleInternalAsync(event, context);
  }

  protected abstract handleInternalAsync(event: TEvent, context?: TContext): Promise<TResult>;

  protected logError(message: string, handledData: any, error: any): void {
    if (BaseFunction.Log?.error) {
      BaseFunction.Log.error(message, handledData, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`${error.stack}\n\n${message}: ${JSON.stringify(handledData)}`);
    }
  }
}
