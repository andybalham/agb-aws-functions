/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import axios from 'axios';

interface TestStartRequest {
  testStack: string;
  testScenario: string;
}

interface TestStartResponse {
  success: boolean;
  message?: string;
}

interface TestPollRequest {
  testStack: string;
  testScenario: string;
}

interface TestPollResponse {
  success?: boolean;
  message?: string;
}

class TestStateItem {
  stack: string;

  // TODO 01Apr21: The context could change whilst a test is still running, which could cause issues if the same receivers are used
  // TODO 01Apr21: I think we need to have generous timeouts
  scenario: string;

  // TODO 01Apr21: How would a receiver know what test part was being processed?
  // TODO 01Apr21: I think this would need to be derived from the event being processed
  itemId: string;

  /*
  SQSFunction | current|scenario                  <-- This gets posted before the test is initiated
  SQSFunction | handle_message_batch|message_01   <-- These get written by receivers and read by the test monitor
  */

  itemData: any;
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

  async startTestAsync(testScenario: string): Promise<TestStartResponse> {
    //
    const testStartRequest: TestStartRequest = {
      testStack: this.testStack,
      testScenario,
    };

    const axiosResponse = await axios.post<TestStartResponse>(
      'run-test',
      testStartRequest,
      this.testApiConfig
    );

    if (axiosResponse.status !== 200) {
      return {
        success: false,
        message: `${this.testStack}:${testScenario} returned unexpected HTTP status: ${axiosResponse.status}`,
      };
    }

    return axiosResponse.data;
  }

  async pollTestStateAsync(testScenario: string, timeoutSeconds = 6): Promise<TestPollResponse> {
    //
    const testPollRequest: TestPollRequest = {
      testStack: this.testStack,
      testScenario,
    };

    const expiryTime = Date.now() + 1000 * timeoutSeconds;

    while (Date.now() < expiryTime) {
      // eslint-disable-next-line no-await-in-loop
      const axiosResponse = await axios.post<TestPollResponse>(
        'poll-test',
        testPollRequest,
        this.testApiConfig
      );

      if (axiosResponse.status !== 200) {
        return {
          success: false,
          message: `${this.testStack}:${testScenario} returned unexpected HTTP status: ${axiosResponse.status}`,
        };
      }

      if (axiosResponse.data.success === true || axiosResponse.data.success === false) {
        return axiosResponse.data;
      }

      // eslint-disable-next-line no-await-in-loop
      await TestRunner.waitAsync(1);
    }

    return {
      success: false,
      message: `${this.testStack}:${testScenario} timed out`,
    };
  }

  static async waitAsync(waitSeconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
}
