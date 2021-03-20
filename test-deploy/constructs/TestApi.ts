/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { IResource } from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';

export default class TestApi extends cdk.Construct {
  //
  readonly root: IResource;

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, `${id}TestApi`);

    const api = new apigateway.RestApi(this, `${id}TestApiGateway`, {
      restApiName: `Test API for ${id}`,
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    this.root = api.root;

    const apiKey = new apigateway.ApiKey(this, `${id}TestApiKey`);

    new apigateway.UsagePlan(this, `${id}TestUsagePlan`, {
      apiKey,
      apiStages: [{ stage: api.deploymentStage }],
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
    path,
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

    const pathParts = path.split('/');

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
