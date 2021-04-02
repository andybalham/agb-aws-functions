/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import axios from 'axios';

export interface TestRunResult {
  success: boolean;
  message?: string;
}

export interface TestStartRequest {
  testStack: string;
  testScenario: string;
}

export interface TestPollRequest {
  testStack: string;
  testScenario: string;
}

export interface TestPollResponse {
  success?: boolean;
  message?: string;
}

export default class TestRunner {
  //
  constructor(
    private testStack: string,
    private testApiConfig: {
      baseURL: string | undefined;
      headers: { 'x-api-key': string | undefined };
    }
  ) {}

  async runTestAsync(testScenario: string, timeoutSeconds = 6): Promise<TestRunResult> {
    //
    const testStartRequest: TestStartRequest = {
      testStack: this.testStack,
      testScenario,
    };

    const startResponse = await axios.post<void>(
      'start-test',
      testStartRequest,
      this.testApiConfig
    );

    if (startResponse.status !== 200) {
      return {
        success: false,
        message: `${this.testStack}:${testScenario} returned unexpected HTTP status for start: ${startResponse.status}`,
      };
    }

    const testPollRequest: TestPollRequest = {
      testStack: this.testStack,
      testScenario,
    };

    const expiryTime = Date.now() + 1000 * timeoutSeconds;

    while (Date.now() < expiryTime) {
      // eslint-disable-next-line no-await-in-loop
      const pollResponse = await axios.post<TestPollResponse>(
        'poll-test',
        testPollRequest,
        this.testApiConfig
      );

      if (pollResponse.status !== 200) {
        return {
          success: false,
          message: `${this.testStack}:${testScenario} returned unexpected HTTP status for poll: ${pollResponse.status}`,
        };
      }

      if (pollResponse.data.success !== undefined) {
        return { ...pollResponse.data, success: pollResponse.data.success ?? false };
      }

      // eslint-disable-next-line no-await-in-loop
      await TestRunner.waitAsync(1);
    }

    return {
      success: false,
      message: `${this.testStack}:${testScenario} timed out`,
    };
  }

  private static async waitAsync(waitSeconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
}
