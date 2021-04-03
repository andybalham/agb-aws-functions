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

  async handleRequestAsync({ testScenario }: TestStartRequest): Promise<void> {
    //
    const testParams = this.getTestParams(testScenario);

    await this.testStateRepository.setStackScenarioAsync(testScenario, testParams);

    await this.startTestAsync(testScenario);
  }

  abstract getTestParams(scenario: string): any | undefined;

  abstract startTestAsync(scenario: string): Promise<void>;
}
