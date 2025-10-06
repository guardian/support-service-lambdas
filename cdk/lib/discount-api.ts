import { GuGetDistributablePolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/sr-api-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class DiscountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'discount-api' });

		const app = this.app;
		const nameWithStage = `${app}-${this.stage}`;

		// ---- API-triggered lambda functions ---- //
		const lambda = new SrApiLambda(
			this,
			`${app}-lambda`,
			{
				description:
					'A lambda that enables the addition of discounts to existing subscriptions',
			},
			{},
		);

		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: 'REST endpoints for discount api',
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

		[
			new GuGetDistributablePolicy(this, this),
			new AllowS3CatalogReadPolicy(this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, `braze-emails`),
		].forEach((p) => lambda.role!.attachInlinePolicy(p));

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`DISCOUNT-API-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new SrLambdaAlarm(this, 'ApiGateway5XXAlarmCDK', {
			app,
			alarmName: alarmName('Discount-api 5XX response'),
			alarmDescription: alarmDescription(
				'Discount api returned a 5XX response check the logs for more information: https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fdiscount-api-PROD',
			),
			evaluationPeriods: 1,
			threshold: 1,
			lambdaFunctionNames: lambda.functionName,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: '5XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.seconds(300),
				dimensionsMap: {
					ApiName: nameWithStage,
				},
			}),
		});

		new SrRestDomain(this, lambda.api);
	}
}
