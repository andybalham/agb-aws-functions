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

  scenarioParams: { [key: string]: () => Record<string, any> } = {};

  scenarios: {
    [key: string]: (scenario: { name: string; params: Record<string, any> }) => Promise<any>;
  } = {};

  constructor(private testStateRepository: TestStateRepository, props?: TestStarterFunctionProps) {
    super(props);
    this.testStarterProps = { ...this.testStarterProps, ...props };
  }

  async handleRequestAsync({ testScenario }: TestStartRequest): Promise<void> {
    //
    const scenarioParamGetter = this.scenarioParams[testScenario];

    const testParams = scenarioParamGetter ? scenarioParamGetter() : {};

    await this.testStateRepository.setStackScenarioAsync(testScenario, testParams);

    await this.startTestAsync(testScenario, testParams);
  }

  async startTestAsync(scenario: string, params: Record<string, any>): Promise<void> {
    //
    const scenarioHandler = this.scenarios[scenario];

    if (scenarioHandler === undefined) throw new Error('scenarioHandler === undefined');

    await scenarioHandler({ name: scenario, params });
  }
}
