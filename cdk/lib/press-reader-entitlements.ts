import { GuGetDistributablePolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration, Fn } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SrApiLambda } from './cdk/sr-api-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class PressReaderEntitlements extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'press-reader-entitlements' });

		const app = this.app;
		const nameWithStage = `${app}-${this.stage}`;

		const supporterProductDataTablePolicy = new PolicyStatement({
			actions: ['dynamodb:Query'],
			resources: [
				Fn.importValue(
					`supporter-product-data-tables-${this.stage}-SupporterProductDataTable`,
				),
			],
		});

		const lambda = new SrApiLambda(
			this,
			`${app}-lambda`,
			{
				description:
					'An API Gateway triggered lambda generated in the support-service-lambdas repo',
				initialPolicy: [supporterProductDataTablePolicy],
				// use the GuCDK alarm
				monitoringConfiguration: {
					http5xxAlarm: { tolerated5xxPercentage: 5 },
					snsTopicName: `alarms-handler-topic-${this.stage}`,
				},
			},
			{},
		);

		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: 'REST endpoints for press-reader-entitlements',
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
			`press-reader-entitlements-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new SrLambdaAlarm(this, 'ApiGateway4XXAlarmCDK', {
			app,
			alarmName: alarmName('API gateway 4XX response'),
			alarmDescription: alarmDescription(
				'Press reader entitlements received an invalid request',
			),
			evaluationPeriods: 1,
			threshold: 10,
			lambdaFunctionNames: lambda.functionName,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: '4XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.seconds(300),
				dimensionsMap: {
					ApiName: nameWithStage,
				},
			}),
		});

		new SrRestDomain(this, lambda.api, false, true);

		[new GuGetDistributablePolicy(this, this)].forEach((p) =>
			lambda.role!.attachInlinePolicy(p),
		);
	}
}
