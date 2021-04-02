/* eslint-disable import/no-extraneous-dependencies */
import { ApiGatewayFunction } from '../src';
import { TestStartRequest } from './TestRunner';
import TestStateRepository from './TestStateRepository';

export default abstract class TestStarterFunction extends ApiGatewayFunction<
  TestStartRequest,
  void
> {
  //
  constructor(private testStateRepository: TestStateRepository) {
    super();
  }

  async handleRequestAsync({ testStack, testScenario }: TestStartRequest): Promise<void> {
    //
    const testExpectations = this.getTestExpectations(testScenario);

    await this.testStateRepository.setStackScenarioAsync(testStack, testScenario, testExpectations);

    await this.startTestAsync(testScenario);
  }

  abstract getTestExpectations(scenario: string): any | undefined;

  abstract startTestAsync(scenario: string): Promise<void>;
}
