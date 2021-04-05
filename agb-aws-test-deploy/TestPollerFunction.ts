/* eslint-disable import/no-extraneous-dependencies */
import { ApiGatewayFunction } from '../src';
import { ApiGatewayFunctionProps } from '../src/ApiGatewayFunction';
import { TestPollRequest, TestPollResponse } from './TestRunner';
import TestStateRepository, { TestStateItem } from './TestStateRepository';

export default abstract class TestPollerFunction extends ApiGatewayFunction<
  TestPollRequest,
  TestPollResponse
> {
  //
  scenarios: {
    [key: string]: (scenario: {
      name: string;
      params: Record<string, any>;
      startTime: number;
      items: TestStateItem[];
    }) => TestPollResponse;
  } = {};

  constructor(private testStateRepository: TestStateRepository, props?: ApiGatewayFunctionProps) {
    super(props);
  }

  async handleRequestAsync({ testScenario }: TestPollRequest): Promise<TestPollResponse> {
    //
    const currentScenario = await this.testStateRepository.getCurrentScenarioAsync();

    const scenarioItems = await this.testStateRepository.getStackScenarioItemsAsync(testScenario);

    if (scenarioItems.length < 1) {
      return {};
    }

    return this.pollTestAsync({ ...currentScenario, items: scenarioItems });
  }

  async pollTestAsync(scenario: {
    name: string;
    params: Record<string, any>;
    startTime: number;
    items: TestStateItem[];
  }): Promise<TestPollResponse> {
    //
    const scenarioHandler = this.scenarios[scenario.name];

    if (scenarioHandler === undefined) throw new Error('scenarioHandler === undefined');

    return scenarioHandler(scenario);
  }
}
