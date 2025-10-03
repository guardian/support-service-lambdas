import { GuApiLambda } from '@guardian/cdk';
import { GuGetDistributablePolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import {
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';
import { nodeVersion } from './node-version';

export class ProductSwitchApi extends SrStack {
	readonly app: string;
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stack: 'support', stage, app: 'product-switch-api' });

		const app = this.app;
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		// ---- API-triggered lambda functions ---- //
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'An API Gateway triggered lambda for carrying out product switches. Code is in the support-service-lambdas repo',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			// Create an alarm
			monitoringConfiguration: {
				noMonitoring: true,
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description: `API Gateway endpoint for the ${nameWithStage} lambda`,
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},

				apiKeySourceType: ApiKeySourceType.HEADER,
				defaultMethodOptions: {
					apiKeyRequired: true,
				},
			},
		});

		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: 'REST endpoints for product-switch-api',
			apiStages: [
				{
					stage: lambda.api.deploymentStage,
					api: lambda.api,
				},
			],
		});

		// create api key
		const apiKey = lambda.api.addApiKey(`${app}-key-${this.stage}`, {
			apiKeyName: `${app}-key-${this.stage}`,
		});

		// associate api key to plan
		usagePlan.addApiKey(apiKey);

		new SrRestDomain(this, lambda);

		[
			new GuGetDistributablePolicy(this, this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(
				this,
				`braze-emails`,
				'supporter-product-data',
				'product-switch-salesforce-tracking',
			),
		].forEach((p) => lambda.role!.attachInlinePolicy(p));

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`PRODUCT-SWITCH-API-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		if (this.stage === 'PROD') {
			new SrLambdaAlarm(this, 'ApiGateway5XXAlarmCDK', {
				app,
				alarmName: alarmName('API gateway 5XX response'),
				alarmDescription: alarmDescription(
					'Product switch api returned a 500 response, please check the logs to diagnose the issue.',
				),
				evaluationPeriods: 1,
				threshold: 1,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.seconds(300),
					dimensionsMap: {
						ApiName: nameWithStage,
					},
				}),
				lambdaFunctionNames: lambda.functionName,
			});
			new SrLambdaAlarm(this, 'ProductSwitchFailureAlarm', {
				app,
				alarmName: alarmName('An error occurred in the Product Switch lambda'),
				alarmDescription: alarmDescription(
					'Product switch lambda failed, please check the logs to diagnose the issue.',
				),
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.seconds(300),
					dimensionsMap: {
						FunctionName: lambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: lambda.functionName,
			});
		}
	}
}
