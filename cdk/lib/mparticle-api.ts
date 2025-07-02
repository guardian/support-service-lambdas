import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, CfnOutput, Duration } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import {
	ManagedPolicy,
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrLambdaDomain } from './cdk/sr-lambda-domain';
import { nodeVersion } from './node-version';

export class MParticleApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'mparticle-api';

		const mparticleLambdaRole = new Role(this, 'MParticleLambdaExecutionRole', {
			roleName: `${app}-${this.stage}-execution-role`,
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole',
				),
			],
		});

		const lambda = new GuLambdaFunction(this, `${app}-lambda`, {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(15),
			handler: 'index.handler',
			functionName: `${app}-${this.stage}`,
			role: mparticleLambdaRole,
			events: [],
			environment: {
				APP: app,
				STACK: this.stack,
				STAGE: this.stage,
			},
		});

		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app: app,
			targets: [
				{
					path: '/data-subject-requests/{requestId}/callback',
					httpMethod: 'POST',
					lambda: lambda,
				},
			],
			monitoringConfiguration: {
				noMonitoring: true,
			},
		});

		if (this.stage === 'PROD') {
			new SrLambdaAlarm(this, 'MParticleApiGateway5XXAlarm', {
				app,
				alarmName: 'API gateway 5XX response',
				alarmDescription:
					'mParticle API callback returned a 500 response, please check the logs.',
				evaluationPeriods: 1,
				threshold: 1,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						ApiName: `${app}-apiGateway`,
					},
				}),
				lambdaFunctionNames: lambda.functionName,
			});

			new SrLambdaAlarm(this, 'MParticleLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle API Lambda',
				alarmDescription:
					'mParticle API Lambda failed, please check the logs to diagnose the issue.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						FunctionName: lambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: lambda.functionName,
			});
		}

		lambda.role?.attachInlinePolicy(
			new Policy(this, `${app}-cloudwatch-policy`, {
				statements: [
					new PolicyStatement({
						actions: ['cloudwatch:ListTagsForResource'],
						resources: ['*'],
					}),
				],
			}),
		);

		new SrLambdaDomain(this, {
			subdomain: 'mparticle-api',
			stage: this.stage,
			restApi: apiGateway.api,
			apiDomain: 'membership',
		});

		new CfnOutput(this, 'MParticleLambdaRoleArn', {
			value: mparticleLambdaRole.roleArn,
			description: 'ARN of the mParticle Lambda execution role',
			exportName: `${app}-${this.stage}-lambda-role-arn`,
		});
	}
}
