/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { ApiGatewayFunction } from '../src';
import { ApiGatewayFunctionProps } from '../src/ApiGatewayFunction';
import { TestStartRequest } from './TestRunner';
import TestStateRepository from './TestStateRepository';

export default abstract class TestStarterFunction extends ApiGatewayFunction<
  TestStartRequest,
  void
> {
  //
  constructor(private testStateRepository: TestStateRepository, props?: ApiGatewayFunctionProps) {
    super(props);
  }

  async handleRequestAsync({ testScenario }: TestStartRequest): Promise<void> {
    //
    const testParams = this.getTestParams(testScenario);

    await this.testStateRepository.setStackScenarioAsync(testScenario, testParams);

    await this.startTestAsync(testScenario);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getTestParams(scenario: string): any | undefined {
    return undefined;
  }

  abstract startTestAsync(scenario: string): Promise<void>;
}
