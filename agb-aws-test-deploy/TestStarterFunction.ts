import { ApiGatewayFunction } from '../src';
import { ApiGatewayFunctionProps } from '../src/ApiGatewayFunction';
import { TestStartRequest } from './TestRunner';
import TestStateRepository from './TestStateRepository';

export interface TestStarterFunctionProps extends ApiGatewayFunctionProps {
  testParamsGetter?: (scenario: string) => Record<string, any>;
}

export default abstract class TestStarterFunction extends ApiGatewayFunction<
  TestStartRequest,
  void
> {
  //
  testStarterProps: TestStarterFunctionProps = {};

  scenarios: { [key: string]: (testParams: Record<string, any>) => Promise<any> } = {};

  constructor(private testStateRepository: TestStateRepository, props?: TestStarterFunctionProps) {
    super(props);
    this.testStarterProps = { ...this.testStarterProps, ...props };
  }

  async handleRequestAsync({ testScenario }: TestStartRequest): Promise<void> {
    //
    const testParams = this.testStarterProps.testParamsGetter
      ? this.testStarterProps.testParamsGetter(testScenario)
      : {};

    await this.testStateRepository.setStackScenarioAsync(testScenario, testParams);

    await this.startTestAsync(testScenario, testParams);
  }

  async startTestAsync(scenario: string, testParams: Record<string, any>): Promise<void> {
    //
    const scenarioHandler = this.scenarios[scenario];

    if (scenarioHandler === undefined) throw new Error('scenarioHandler === undefined');

    await scenarioHandler(testParams);
  }
}
