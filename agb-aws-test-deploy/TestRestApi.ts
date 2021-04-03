/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import TestStateDynamoDBTable from './TestStateDynamoDBTable';

export interface TestApiProps {
  testApiKeyValue?: string;
}

export default class TestRestApi extends cdk.Construct {
  //
  readonly id: string;

  readonly apiRoot: apigateway.IResource;

  readonly testStateTable: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string, props: TestApiProps) {
    //
    super(scope, `${id}TestApi`);

    this.id = id;

    const api = new apigateway.RestApi(this, `${id}TestApiGateway`, {
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
      description: `Test API for ${id}`,
    });

    this.apiRoot = api.root;

    const apiKeyValue = props.testApiKeyValue;

    const apiKey = api.addApiKey(`${id}TestApiKey`, {
      value: apiKeyValue,
    });

    if (apiKeyValue) {
      new cdk.CfnOutput(this, `${id}TestApiKey`, {
        value: apiKeyValue,
      });
    } else {
      new cdk.CfnOutput(this, `${id}TestApiKeyId`, {
        value: apiKey.keyId,
      });
    }

    new apigateway.UsagePlan(this, `${id}TestUsagePlan`, {
      apiKey,
      apiStages: [{ stage: api.deploymentStage }],
      throttle: {
        burstLimit: 10,
        rateLimit: 10,
      },
      description: `${id} Test Usage Plan`,
    });

    this.testStateTable = new TestStateDynamoDBTable(this, id);
  }

  addTestStarterFunction(
    entryModulePath: string,
    environment?: { [key: string]: string }
  ): lambda.Function {
    //
    const testStarterFunction = new lambdaNodejs.NodejsFunction(this, `${this.id}StarterFunction`, {
      entry: entryModulePath,
      handler: 'testStarterHandler',
      environment: {
        ...environment,
        TEST_TABLE_NAME: this.testStateTable.tableName,
      },
    });

    this.testStateTable.grantReadWriteData(testStarterFunction);

    this.addPostFunction({
      path: 'start-test',
      methodFunction: testStarterFunction,
    });

    return testStarterFunction;
  }

  addTestPollerFunction(
    entryModulePath: string,
    environment?: { [key: string]: string }
  ): lambda.Function {
    //
    const testPollerFunction = new lambdaNodejs.NodejsFunction(this, `${this.id}PollerFunction`, {
      entry: entryModulePath,
      handler: 'testPollerHandler',
      environment: {
        ...environment,
        TEST_TABLE_NAME: this.testStateTable.tableName,
      },
    });

    this.testStateTable.grantReadData(testPollerFunction);

    this.addPostFunction({
      path: 'poll-test',
      methodFunction: testPollerFunction,
    });

    return testPollerFunction;
  }

  // private addGetFunction(args: {
  //   path: string;
  //   methodFunction: lambda.Function;
  //   options?: apigateway.MethodOptions;
  // }): apigateway.Method {
  //   return this.addMethodFunction({ ...args, httpMethod: 'GET' });
  // }

  // TODO 02Apr21: Make this private
  addPostFunction(args: {
    path: string;
    methodFunction: lambda.Function;
    options?: apigateway.MethodOptions;
  }): apigateway.Method {
    return this.addMethodFunction({ ...args, httpMethod: 'POST' });
  }

  private addMethodFunction({
    path: methodPath,
    httpMethod,
    methodFunction,
    options,
  }: {
    path: string;
    httpMethod: string;
    methodFunction: lambda.Function;
    options?: apigateway.MethodOptions;
  }): apigateway.Method {
    //
    const methodOptionsWithApiKey = { ...options, apiKeyRequired: true };

    const pathParts = methodPath.split('/');

    const functionResource = pathParts.reduce(
      (resource: apigateway.IResource, pathPart: string) =>
        resource.getResource(pathPart) ?? resource.addResource(pathPart),
      this.apiRoot
    );

    return functionResource.addMethod(
      httpMethod,
      new apigateway.LambdaIntegration(methodFunction),
      methodOptionsWithApiKey
    );
  }
}