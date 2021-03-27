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
  testApiKeyValue?: string;
}

export default class TestRestApi extends cdk.Construct {
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

    const testReaderFunction = new lambdaNodejs.NodejsFunction(scope, id, {
      entry: path.join(__dirname, '.', `TestStateReaderFunction.ts`),
      handler: 'testStateReaderHandler',
      environment: {
        TEST_TABLE_NAME: props.testTable.tableName,
      },
    });

    props.testTable.grantReadData(testReaderFunction);

    this.addGetFunction({
      path: 'test/{testStack}/{testName}',
      methodFunction: testReaderFunction,
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
