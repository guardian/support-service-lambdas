import { GuApiLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
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

export interface UpdateSupporterPlusAmountProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class UpdateSupporterPlusAmount extends SrStack {
	readonly app: string;
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stack: 'support',
			stage,
			app: 'update-supporter-plus-amount',
		});

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
				'An API Gateway triggered lambda to carry out supporter plus amount updates',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			monitoringConfiguration: {
				noMonitoring: true,
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description: 'API Gateway created by CDK',
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
			description: 'REST endpoints for update-supporter-plus-amount',
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

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`update-supporter-plus-amount-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		if (this.stage === 'PROD') {
			new SrLambdaAlarm(this, 'ApiGateway5XXAlarm', {
				app,
				alarmName: alarmName(
					'Update supporter plus amount - API gateway 5XX response',
				),
				alarmDescription: alarmDescription(
					'Update supporter plus amount api returned a 5XX response. This means that a user who was trying to update the ' +
						'contribution amount of their supporter plus subscription has received an error. Please check the logs to diagnose the issue',
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
		}

		new SrRestDomain(this, lambda);

		[
			new GuGetDistributablePolicy(this, this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, 'braze-emails', 'supporter-product-data'),
		].forEach((p) => lambda.role!.attachInlinePolicy(p));
	}
}
