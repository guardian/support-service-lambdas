import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';

export class HolidayStopProcessor extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'holiday-stop-processor';
		const functionName = `${app}-${this.stage}`;

		// Map stage-specific configurations
		const stageConfig = {
			CODE: {
				fulfilmentDatesBucketUrn:
					'arn:aws:s3:::fulfilment-date-calculator-code/*',
				scheduleName: 'holiday-stop-processor-schedule-code',
			},
			PROD: {
				fulfilmentDatesBucketUrn:
					'arn:aws:s3:::fulfilment-date-calculator-prod/*',
				scheduleName: 'holiday-stop-processor-schedule',
			},
		};

		const config = stageConfig[this.stage as keyof typeof stageConfig];

		// Create the scheduled lambda
		const holidayStopProcessorLambda = new GuScheduledLambda(
			this,
			'HolidayStopProcessor',
			{
				app,
				fileName: `${app}.jar`,
				functionName,
				description:
					'Updates subscriptions with outstanding holiday stops. Source - https://github.com/guardian/support-service-lambdas/tree/main/handlers/holiday-stop-processor',
				handler: 'com.gu.holidaystopprocessor.Handler::handle',
				runtime: Runtime.JAVA_21,
				memorySize: 1232,
				timeout: Duration.seconds(900),
				loggingFormat: LoggingFormat.TEXT,
				environment: {
					Stage: this.stage,
				},
				monitoringConfiguration: {
					noMonitoring: true, // We'll create custom alarms
				},
				rules: [
					{
						schedule: Schedule.expression('cron(0/20 * ? * * *)'), // Every 20 minutes
						description:
							'Trigger processing of holiday stops every 20 mins (to ensure successful processing of all batches within 24 hours)',
					},
				],
			},
		);

		// Set maximum retry attempts to 0 (as processor runs every 20 mins anyway, there's no need to retry)
		holidayStopProcessorLambda.configureAsyncInvoke({
			maxEventAge: Duration.hours(1),
			retryAttempts: 0,
		});

		// ---- IAM Policies ---- //
		const s3Policy = new Policy(this, 'S3Policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/zuoraRest-${this.stage}*.json`,
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/sfAuth-${this.stage}*.json`,
						config.fulfilmentDatesBucketUrn,
					],
				}),
			],
		});

		// Attach policy to lambda role
		holidayStopProcessorLambda.role?.attachInlinePolicy(s3Policy);

		// ---- CloudWatch Alarm (PROD only) ---- //
		if (this.stage === 'PROD') {
			new SrLambdaAlarm(this, 'HolidayStopProcessorFailureAlarm', {
				app,
				alarmName: 'URGENT 9-5 - PROD: Failed to process holiday stops',
				alarmDescription: `IMPACT: If this goes unaddressed at least one subscription that was supposed to be suspended will be fulfilled. Until we document how to deal with likely problems please alert the Value team. For general advice, see https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk`,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.seconds(60),
					dimensionsMap: {
						FunctionName: functionName,
					},
				}),
				threshold: 1,
				datapointsToAlarm: 10,
				evaluationPeriods: 240,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				lambdaFunctionNames: functionName,
			});
		}
	}
}
