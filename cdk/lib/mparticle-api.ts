import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import {
	AccountPrincipal,
	Effect,
	Policy,
	PolicyStatement,
	Role,
} from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrLambdaDomain } from './cdk/sr-lambda-domain';
import { nodeVersion } from './node-version';

export class MParticleApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'mparticle-api';

		const batonAccountId = StringParameter.fromStringParameterName(
			this,
			'BatonAccountId',
			'/accountIds/baton',
		).stringValue;

		const sarResultsBucket = StringParameter.fromStringParameterName(
			this,
			'SarResultsBucket',
			`/${this.stage}/${this.stack}/${app}/sarResultsBucket`,
		).stringValue;

		// this must be the same as used in the code
		const sarS3BaseKey = 'mparticle-results/';

		// HTTP API Lambda
		const httpLambda = new GuLambdaFunction(this, `${app}-http-lambda`, {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(15),
			loggingFormat: LoggingFormat.TEXT,
			handler: 'index.handlerHttp',
			functionName: `${app}-http-${this.stage}`,
		});

		// make sure our lambda can write to the central baton bucket
		// https://github.com/guardian/baton/?tab=readme-ov-file#:~:text=The%20convention%20is%20to%20write%20these%20to%20the%20gu%2Dbaton%2Dresults%20bucket%20that%20is%20hosted%20in%20the%20baton%20AWS%20account.
		const s3BatonWritePolicy: PolicyStatement = new PolicyStatement({
			actions: ['s3:PutObject'],
			resources: [`arn:aws:s3:::${sarResultsBucket}/${sarS3BaseKey}*`],
		});

		const batonLambda = new GuLambdaFunction(this, `${app}-baton-lambda`, {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			loggingFormat: LoggingFormat.TEXT,
			handler: 'index.handlerBaton',
			functionName: `${app}-baton-${this.stage}`,
			initialPolicy: [s3BatonWritePolicy],
		});

		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app: app,
			targets: [
				{
					path: '/data-subject-requests/{requestId}/callback',
					httpMethod: 'POST',
					lambda: httpLambda,
				},
			],
			monitoringConfiguration: {
				noMonitoring: true,
			},
		});

		if (this.stage === 'PROD') {
			// API Gateway 5XX alarm
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
				lambdaFunctionNames: httpLambda.functionName,
			});

			// HTTP Lambda error alarm
			new SrLambdaAlarm(this, 'MParticleHttpLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle HTTP Lambda',
				alarmDescription:
					'mParticle HTTP Lambda failed, please check the logs to diagnose the issue.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						FunctionName: httpLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: httpLambda.functionName,
			});

			// Baton Lambda error alarm
			new SrLambdaAlarm(this, 'MParticleBatonLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle Baton Lambda',
				alarmDescription:
					'Impact: a user may not be deleted from mParticle+Braze after an erasure request, and Baton would display an error.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						FunctionName: batonLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: batonLambda.functionName,
			});
		}

		new SrLambdaDomain(this, {
			subdomain: 'mparticle-api',
			restApi: apiGateway.api,
		});

		/**
		 * Export Lambda role ARN for cross-account queue access.
		 * The SQS queue policy in account "Ophan" imports this ARN
		 * to grant this Lambda sqs:SendMessage permissions to the erasure queue.
		 * We grant the permission so baton can call the lambdas directly as per:
		 * https://github.com/guardian/baton?tab=readme-ov-file#adding-data-sources-to-baton
		 * https://github.com/guardian/baton-lambda-template/blob/61ebdec91bd53e218d5f5a2aa90494db69adfa0a/src/main/g8/cfn.yaml#L44-L46
		 */
		const batonInvokeRole = new Role(this, 'BatonInvokeRole', {
			roleName: `baton-mparticle-lambda-role-${this.stage}`,
			assumedBy: new AccountPrincipal(batonAccountId),
		});
		batonInvokeRole.attachInlinePolicy(
			new Policy(this, 'BatonRunLambdaPolicy', {
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['lambda:InvokeFunction'],
						resources: [batonLambda.functionArn], // Only Baton Lambda needs to be invokable
					}),
				],
			}),
		);
	}
}
