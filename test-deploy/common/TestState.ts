export interface TestRunRequest {
  testStack: string;
  testName: string;
  testInput: Record<string, any>;
  timeoutSeconds: number;
  expectedOutput: Record<string, any>;
}

export interface TestReadRequest {
  testStack: string;
  testName: string;
}

export interface TestReadResponse {
  testStack: string;
  testName: string;
  expectedOutput: Record<string, any>;
  startTime: number;
  timeoutTime: number;
  actualOutput?: Record<string, any>;
}

export interface TestState extends TestRunRequest, TestReadResponse {}
