import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, CfnPermission, Runtime } from 'aws-cdk-lib/aws-lambda';
import type { IConstruct } from 'constructs';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class HolidayStopProcessor extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stack: 'membership',
			stage,
			app: 'holiday-stop-processor',
		});
		const isProd = stage === 'PROD';
		const scheduleRules = isProd
			? [
					{
						schedule: Schedule.cron({ minute: '0/20' }),
						description:
							'IMPACT: If this goes unaddressed at least one subscription that was supposed to be suspended will be fulfilled. Until we document how to deal with likely problems please alert the Value team. For general advice, see https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk',
						name: 'holiday-stop-processor-schedule',
						input: RuleTargetInput.fromObject(null),
					},
				]
			: [];

		const lambda = new SrScheduledLambda(this, 'Lambda', {
			rules: scheduleRules,
			monitoring: {
				noMonitoring: true, // Custom alarm
			},
			lambdaOverrides: {
				functionName: `holiday-stop-processor-${stage}`,
				runtime: Runtime.JAVA_21,
				architecture: Architecture.ARM_64,
				fileName: 'holiday-stop-processor.jar',
				handler: 'com.gu.holidaystopprocessor.Handler::handle',
				memorySize: 1232,
				timeout: Duration.minutes(15),
				retryAttempts: 0,
				description:
					'Updates subscriptions with outstanding holiday stops. Source - https://github.com/guardian/support-service-lambdas/tree/main/handlers/holiday-stop-processor',
				environment: {
					Stage: stage,
				},
			},
		});

		const fulfilmentDatesCalculatorBucket = new PolicyStatement({
			actions: ['s3:GetObject'],
			resources: [
				`arn:aws:s3:::fulfilment-date-calculator-${stage.toLowerCase()}/*`,
			],
			effect: Effect.ALLOW,
		});
		const zuoraRestS3Statement = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [
				`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${stage}/zuoraRest-${stage}*.json`,
			],
		});
		const sfAuthS3Statement = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [
				`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${stage}/sfAuth-${stage}*.json`,
			],
		});

		lambda.addToRolePolicy(fulfilmentDatesCalculatorBucket);
		lambda.addToRolePolicy(zuoraRestS3Statement);
		lambda.addToRolePolicy(sfAuthS3Statement);

		let failureAlarm: SrLambdaErrorAlarm | undefined;
		if (isProd) {
			failureAlarm = new SrLambdaErrorAlarm(this, 'FailureAlarm', {
				lambdaFunctionName: lambda.functionName,
				alarmName: 'URGENT 9-5 - PROD: Failed to process holiday stops',
				errorImpact:
					'IMPACT: If this goes unaddressed at least one subscription that was supposed to be suspended will be fulfilled. Until we document how to deal with likely problems please alert the Value team. For general advice, see https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk',
				evaluationPeriods: 240,
				datapointsToAlarm: 10,
				threshold: 1,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: TreatMissingData.NOT_BREACHING,
			});
		}

		const resourcesKeepingExistingLogicalIds: Array<{
			construct: IConstruct;
			forcedLogicalId: string;
			reason: string;
		}> = [
			{
				construct: lambda,
				forcedLogicalId: 'HolidayStopProcessor',
				reason: 'Keeping resource names consistent.',
			},
			{
				construct: lambda.node.findChild('EventInvokeConfig'),
				forcedLogicalId: 'HolidayStopProcessorRetryConfig',
				reason: 'Keeping resource names consistent.',
			},
			{
				construct: lambda.node.findChild('ServiceRole'),
				forcedLogicalId: 'HolidayStopProcessorRole',
				reason: 'Keeping resource names consistent.',
			},
			{
				construct: lambda.node
					.findChild('ServiceRole')
					.node.findChild('DefaultPolicy'),
				forcedLogicalId: 'HolidayStopProcessorPolicy',
				reason: 'Keeping resource names consistent.',
			},
			...(failureAlarm
				? [
						{
							construct: failureAlarm,
							forcedLogicalId: 'HolidayStopProcessorFailureAlarm',
							reason: 'Keeping resource names consistent.',
						},
						{
							construct: lambda.node.findChild('Rule0'),
							forcedLogicalId: 'HolidayStopProcessorScheduleRule',
							reason: 'Keeping resource names consistent.',
						},
					]
				: []),
		];

		resourcesKeepingExistingLogicalIds.forEach(
			({ construct, forcedLogicalId, reason }) => {
				this.overrideLogicalId(construct, {
					logicalId: forcedLogicalId,
					reason,
				});
			},
		);

		lambda.node.findAll().forEach((child) => {
			if (child instanceof CfnPermission) {
				child.overrideLogicalId('HolidayStopProcessorLambdaInvokePermission');
			}
		});
	}
}
