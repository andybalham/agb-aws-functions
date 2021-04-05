import { ApiGatewayFunction } from '../src';
import { ApiGatewayFunctionProps } from '../src/ApiGatewayFunction';
import { TestStartRequest } from './TestRunner';
import TestStateRepository from './TestStateRepository';

export interface TestStarterFunctionProps extends ApiGatewayFunctionProps {
  testParamsGetter?: (scenario: string) => any;
}

export default abstract class TestStarterFunction extends ApiGatewayFunction<
  TestStartRequest,
  void
> {
  //
  testStarterProps: TestStarterFunctionProps = {};

  scenarios: { [key: string]: () => Promise<any> } = {};

  constructor(private testStateRepository: TestStateRepository, props?: TestStarterFunctionProps) {
    super(props);
    this.testStarterProps = { ...this.testStarterProps, ...props };
  }

  async handleRequestAsync({ testScenario }: TestStartRequest): Promise<void> {
    //
    const testParams = this.testStarterProps.correlationIdGetter
      ? this.testStarterProps.correlationIdGetter
      : undefined;

    await this.testStateRepository.setStackScenarioAsync(testScenario, testParams);

    await this.startTestAsync(testScenario);
  }

  async startTestAsync(scenario: string): Promise<void> {
    //
    const scenarioHandler = this.scenarios[scenario];

    if (scenarioHandler === undefined) throw new Error('scenarioHandler === undefined');

    await scenarioHandler();
  }
}
