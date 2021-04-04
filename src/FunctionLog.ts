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
  // TODO 04Apr21: Provide a better implementation
}
