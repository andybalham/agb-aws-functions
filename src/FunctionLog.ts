/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FunctionLog {
  //
  debug?: (message: string, params?: Record<string, any>) => void;

  error?: (message: string, params?: Record<string, any>, err?: Error) => void;

  info?: (message: string, params?: Record<string, any>) => void;

  warn?: (message: string, params?: any, err?: Error) => void;
}

export class ConsoleFunctionLog implements FunctionLog {
  //
  debug(message: string, params?: Record<string, any>): void {
    console.debug(`${JSON.stringify({ message, params })}`);
  }

  error(message: string, params?: Record<string, any>, err?: Error): void {
    console.error(
      `${JSON.stringify({
        message,
        params,
        errorMessage: err?.message,
        errorStack: err?.stack,
      })}`
    );
  }

  info(message: string, params?: Record<string, any>): void {
    console.info(`${JSON.stringify({ message, params })}`);
  }

  warn(message: string, params?: Record<string, any>, err?: Error): void {
    console.warn(
      `${JSON.stringify({
        message,
        params,
        errorMessage: err?.message,
        errorStack: err?.stack,
      })}`
    );
  }
}
