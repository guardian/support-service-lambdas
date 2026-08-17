import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import type { IConstruct } from 'constructs';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class DeliveryProblemCreditProcessor extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stack: 'membership',
			stage,
			app: 'delivery-problem-credit-processor',
		});
		const isProd = stage === 'PROD';
		const scheduleRules = isProd
			? [
					{
						schedule: Schedule.cron({ minute: '0/20' }),
						input: RuleTargetInput.fromText('null'),
						description:
							'Trigger processing of delivery-problem credits every 20 mins',
					},
				]
			: [];

		const lambda = new SrScheduledLambda(this, 'Lambda', {
			rules: scheduleRules,
			monitoring: {
				noMonitoring: true, // Custom alarm
			},
			lambdaOverrides: {
				// DeliveryProblemCreditProcessor AWS::Lambda::Function
				functionName: `delivery-problem-credit-processor-${stage}`,
				runtime: Runtime.JAVA_21,
				architecture: Architecture.ARM_64,
				fileName: 'delivery-problem-credit-processor.jar',
				handler: 'com.gu.deliveryproblemcreditprocessor.Handler::handle',
				memorySize: 1024,
				timeout: Duration.seconds(900),
				retryAttempts: 0,
				description:
					'Applies credit amendments for delivery problems. Source - https://github.com/guardian/support-service-lambdas/tree/main/handlers/delivery-problem-credit-processor',
				environment: {
					Stage: stage,
				},
			},
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
		const deliveryProblemProcessorPolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['lambda:InvokeFunction'],
			resources: [
				`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/delivery-problem-credit-processor-${stage}:log-stream:*`,
			],
		});

		lambda.addToRolePolicy(deliveryProblemProcessorPolicy);
		lambda.addToRolePolicy(zuoraRestS3Statement);
		lambda.addToRolePolicy(sfAuthS3Statement);

		let failureAlarm: SrLambdaErrorAlarm | undefined;
		if (isProd) {
			failureAlarm = new SrLambdaErrorAlarm(this, 'FailureAlarm', {
				lambdaFunctionName: lambda.functionName,
				alarmName:
					'URGENT 9-5 - PROD: Failed to process delivery-problem credits',
				errorImpact:
					'IMPACT: If this goes unaddressed at least one subscription that was supposed to be suspended will be fulfilled. Until we document how to deal with likely problems please alert the SX team. For general advice, see https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk',
				evaluationPeriods: 65,
				datapointsToAlarm: 3,
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
				forcedLogicalId: 'DeliveryProblemCreditProcessor',
				reason:
					'The original cfn stack used this logical id for the lambda function, so we need to keep it to avoid dropping and recreating the function.',
			},
			{
				construct: lambda.node.findChild('EventInvokeConfig'),
				forcedLogicalId: 'DeliveryProblemCreditProcessorLambdaInvokeConfig',
				reason:
					'Keep the original cfn logical id so CloudFormation updates the existing fn|$LATEST async-invoke config in place instead of creating a duplicate.',
			},
			{
				construct: lambda.node.findChild('ServiceRole'),
				forcedLogicalId: 'DeliveryProblemCreditProcessorRole',
				reason:
					'Keep the original cfn logical id so CloudFormation updates the existing policy in place instead of creating a duplicate.',
			},
			{
				construct: lambda.node
					.findChild('ServiceRole')
					.node.findChild('DefaultPolicy'),
				forcedLogicalId: 'DeliveryProblemCreditProcessorPolicy',
				reason:
					'Keep the original cfn logical id so CloudFormation updates the existing policy in place instead of creating a duplicate.',
			},
			...(failureAlarm
				? [
						{
							construct: failureAlarm,
							forcedLogicalId: 'DeliveryProblemCreditProcessorFailureAlarm',
							reason:
								'Keep the original cfn logical id; the AlarmName is unchanged so an in-place update avoids an alarm-name collision (PROD).',
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
	}
}
