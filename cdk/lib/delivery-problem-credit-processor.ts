import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';

export class DeliveryProblemCreditProcessor extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'delivery-problem-credit-processor';
		const functionName = `${app}-${this.stage}`;

		// Map stage-specific configurations
		const stageConfig: {
			scheduleName: string;
			shouldSchedule: boolean;
		} = {
			CODE: {
				scheduleName: 'delivery-problem-credit-processor-schedule-code',
				shouldSchedule: false, // No need to run on a schedule in Dev stage
			},
			PROD: {
				scheduleName: 'delivery-problem-credit-processor-schedule-prod',
				shouldSchedule: true,
			},
		}[this.stage] ?? {
			scheduleName: 'delivery-problem-credit-processor-schedule-code',
			shouldSchedule: false,
		};

		// Create the scheduled Lambda only if we need scheduling
		if (stageConfig.shouldSchedule) {
			// For PROD: Create scheduled Lambda with EventBridge rule
			const deliveryProblemCreditProcessor = new GuScheduledLambda(this, 'DeliveryProblemCreditProcessor', {
				fileName: 'delivery-problem-credit-processor.jar',
				handler: 'com.gu.deliveryproblemcreditprocessor.Handler::handle',
				runtime: Runtime.JAVA_21,
				memorySize: 1024,
				timeout: Duration.minutes(15),
				environment: {
					Stage: this.stage,
				},
				app: app,
				functionName: functionName,
				description: 'Applies credit amendments for delivery problems. Source - https://github.com/guardian/support-service-lambdas/tree/main/handlers/delivery-problem-credit-processor',
				architecture: Architecture.ARM_64,
				loggingFormat: LoggingFormat.TEXT,
				rules: [
					{
						schedule: Schedule.cron({
							minute: '0/20', // Every 20 minutes
							hour: '*',
							month: '*',
							year: '*',
						}),
						description: 'Trigger processing of delivery-problem credits every 20 mins',
					},
				],
				monitoringConfiguration: {
					noMonitoring: true, // We'll create custom alarms
				},
			});

			// Add S3 permissions for Zuora credentials
			deliveryProblemCreditProcessor.addToRolePolicy(
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/zuoraRest-${this.stage}*.json`,
					],
				}),
			);

			// Add S3 permissions for Salesforce credentials
			deliveryProblemCreditProcessor.addToRolePolicy(
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/sfAuth-${this.stage}*.json`,
					],
				}),
			);

			// Create PROD-only CloudWatch alarm for failures
			if (this.stage === 'PROD') {
				new SrLambdaAlarm(this, 'DeliveryProblemCreditProcessorFailureAlarm', {
					app,
					alarmName: 'URGENT 9-5 - PROD: Failed to process delivery-problem credits',
					alarmDescription: 'IMPACT: If this goes unaddressed at least one subscription that was supposed to be suspended will be fulfilled. Until we document how to deal with likely problems please alert the SX team. For general advice, see https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk',
					evaluationPeriods: 1,
					threshold: 3,
					comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
					treatMissingData: TreatMissingData.IGNORE,
					metric: new Metric({
						metricName: 'Errors',
						namespace: 'AWS/Lambda',
						dimensionsMap: {
							FunctionName: functionName,
						},
						statistic: 'Sum',
						period: Duration.hours(1),
					}),
					lambdaFunctionNames: deliveryProblemCreditProcessor.functionName,
				});
			}
		} else {
			// For CODE: Create Lambda without scheduling
			const deliveryProblemCreditProcessor = new GuLambdaFunction(this, 'DeliveryProblemCreditProcessor', {
				fileName: 'delivery-problem-credit-processor.jar',
				handler: 'com.gu.deliveryproblemcreditprocessor.Handler::handle',
				runtime: Runtime.JAVA_21,
				memorySize: 1024,
				timeout: Duration.minutes(15),
				environment: {
					Stage: this.stage,
				},
				app: app,
				functionName: functionName,
				description: 'Applies credit amendments for delivery problems. Source - https://github.com/guardian/support-service-lambdas/tree/main/handlers/delivery-problem-credit-processor',
				architecture: Architecture.ARM_64,
				loggingFormat: LoggingFormat.TEXT,
			});

			// Add S3 permissions for Zuora credentials
			deliveryProblemCreditProcessor.addToRolePolicy(
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/zuoraRest-${this.stage}*.json`,
					],
				}),
			);

			// Add S3 permissions for Salesforce credentials
			deliveryProblemCreditProcessor.addToRolePolicy(
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/sfAuth-${this.stage}*.json`,
					],
				}),
			);
		}
	}
}
