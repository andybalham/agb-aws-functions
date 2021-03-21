/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { IResource } from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';

export interface TestApiProps {
  testTable: dynamodb.Table;
}

export default class TestApi extends cdk.Construct {
  //
  readonly root: IResource;

  constructor(scope: cdk.Construct, id: string, props: TestApiProps) {
    //
    super(scope, `${id}TestApi`);

    const api = new apigateway.RestApi(this, `${id}TestApiGateway`, {
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
      description: `Test API for ${id}`,
    });

    this.root = api.root;

    // TODO 21Mar21: Could we just add an API key like the following?
    // const apiKey = api.addApiKey(`${id}TestApiKey`, {
    //   description: `${id} Test Api Key`,
    // });

    const apiKey = new apigateway.ApiKey(this, `${id}TestApiKey`, {
      description: `${id} Test Api Key`,
    });

    new apigateway.UsagePlan(this, `${id}TestUsagePlan`, {
      apiKey,
      apiStages: [{ stage: api.deploymentStage }],
      throttle: {
        burstLimit: 10,
        rateLimit: 10,
      },
      description: `${id} Test Usage Plan`,
    });

    const testReaderFunction = new lambdaNodejs.NodejsFunction(scope, id, {
      entry: path.join(__dirname, '.', `TestReaderFunction.ts`),
      handler: 'testReaderHandler',
      environment: {
        TEST_TABLE_NAME: props.testTable.tableName,
      },
    });

    props.testTable.grantReadData(testReaderFunction);

    this.addGetFunction({
      path: 'test/{testStack}/{testName}',
      methodFunction: testReaderFunction,
    });

    new cdk.CfnOutput(this, `${id}TestApiKeyId`, {
      value: apiKey.keyId,
    });
  }

  addGetFunction(args: {
    path: string;
    methodFunction: lambda.Function;
    options?: apigateway.MethodOptions;
  }): apigateway.Method {
    return this.addMethodFunction({ ...args, httpMethod: 'GET' });
  }

  addPostFunction(args: {
    path: string;
    methodFunction: lambda.Function;
    options?: apigateway.MethodOptions;
  }): apigateway.Method {
    return this.addMethodFunction({ ...args, httpMethod: 'POST' });
  }

  addMethodFunction({
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
      this.root
    );

    return functionResource.addMethod(
      httpMethod,
      new apigateway.LambdaIntegration(methodFunction),
      methodOptionsWithApiKey
    );
  }
}
