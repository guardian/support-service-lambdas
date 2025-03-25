import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { aws_cloudwatch, Duration } from 'aws-cdk-lib';
import {
	Alarm,
	Metric,
	Stats,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import {
	Effect,
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	DefinitionBody,
	JsonPath,
	Map,
	StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class DiscountExpiryNotifier extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'discount-expiry-notifier';

		const role = new Role(this, 'query-lambda-role', {
			// Set the name of the role rather than using an autogenerated name.
			// This is because if the ARN is too long then it breaks the authentication request to GCP
			roleName: `disc-exp-alert-${this.stage}`,
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
		});
		role.addToPolicy(
			new PolicyStatement({
				actions: ['ssm:GetParameter'],
				resources: [
					`arn:aws:ssm:${this.region}:${this.account}:parameter/discount-expiry-notifier/${this.stage}/gcp-credentials-config`,
				],
			}),
		);
		role.addToPolicy(
			new PolicyStatement({
				actions: [
					'logs:CreateLogGroup',
					'logs:CreateLogStream',
					'logs:PutLogEvents',
				],
				resources: ['*'],
			}),
		);

		const allowPutMetric = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['cloudwatch:PutMetricData'],
			resources: ['*'],
		});

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${appName}-${this.stage.toLowerCase()}`,
		});

		const getExpiringDiscountsLambda = new GuLambdaFunction(
			this,
			'get-expiring-discounts-lambda',
			{
				app: appName,
				functionName: `${appName}-get-expiring-discounts-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
					DAYS_UNTIL_DISCOUNT_EXPIRY_DATE: '32',
				},
				handler: 'getExpiringDiscounts.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [allowPutMetric],
				timeout: Duration.seconds(300),
				role,
			},
		);

		const filterRecordsLambda = new GuLambdaFunction(
			this,
			'filter-records-lambda',
			{
				app: appName,
				functionName: `${appName}-filter-records-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
					FILTER_BY_REGIONS: 'US,USA,United States,United States of America',
				},
				handler: 'filterRecords.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [allowPutMetric],
			},
		);

		const getSubStatusLambda = new GuLambdaFunction(
			this,
			'get-sub-status-lambda',
			{
				app: appName,
				functionName: `${appName}-get-sub-status-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
				},
				handler: 'getSubStatus.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						],
					}),
				],
			},
		);

		const getOldPaymentAmountLambda = new GuLambdaFunction(
			this,
			'get-old-payment-amount-lambda',
			{
				app: appName,
				functionName: `${appName}-get-old-payment-amount-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
				},
				handler: 'getOldPaymentAmount.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						],
					}),
				],
			},
		);
		const getNewPaymentAmountLambda = new GuLambdaFunction(
			this,
			'get-new-payment-amount-lambda',
			{
				app: appName,
				functionName: `${appName}-get-new-payment-amount-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
				},
				handler: 'getNewPaymentAmount.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						],
					}),
				],
			},
		);

		const sendEmailLambda = new GuLambdaFunction(this, 'send-email-lambda', {
			app: appName,
			functionName: `${appName}-send-email-${this.stage}`,
			runtime: nodeVersion,
			environment: {
				Stage: this.stage,
				S3_BUCKET: bucket.bucketName,
			},
			handler: 'sendEmail.handler',
			fileName: `${appName}.zip`,
			architecture: Architecture.ARM_64,
		});

		const saveResultsLambda = new GuLambdaFunction(
			this,
			'save-results-lambda',
			{
				app: appName,
				functionName: `${appName}-save-results-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
					S3_BUCKET: bucket.bucketName,
				},
				handler: 'saveResults.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['s3:GetObject', 's3:PutObject'],
						resources: [bucket.arnForObjects('*')],
					}),
					allowPutMetric,
				],
			},
		);

		const alarmOnFailuresLambda = new GuLambdaFunction(
			this,
			'alarm-on-failures-lambda',
			{
				app: appName,
				functionName: `${appName}-alarm-on-failures-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
				},
				handler: 'alarmOnFailures.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [allowPutMetric],
			},
		);

		const getExpiringDiscountsLambdaTask = new LambdaInvoke(
			this,
			'Get expiring discounts',
			{
				lambdaFunction: getExpiringDiscountsLambda,
				outputPath: '$.Payload',
			},
		).addRetry({
			errors: ['States.ALL'],
			interval: Duration.seconds(10),
			maxAttempts: 2, // Retry only once (1 initial attempt + 1 retry)
		});

		const filterRecordsLambdaTask = new LambdaInvoke(
			this,
			'Filter records by region',
			{
				lambdaFunction: filterRecordsLambda,
				outputPath: '$.Payload',
			},
		);

		const getSubStatusLambdaTask = new LambdaInvoke(this, 'Get sub status', {
			lambdaFunction: getSubStatusLambda,
			outputPath: '$.Payload',
		});

		const getOldPaymentAmountLambdaTask = new LambdaInvoke(
			this,
			'Get old payment amount',
			{
				lambdaFunction: getOldPaymentAmountLambda,
				outputPath: '$.Payload',
			},
		);

		const getNewPaymentAmountLambdaTask = new LambdaInvoke(
			this,
			'Get new payment amount',
			{
				lambdaFunction: getNewPaymentAmountLambda,
				outputPath: '$.Payload',
			},
		);

		const saveResultsLambdaTask = new LambdaInvoke(this, 'Save results', {
			lambdaFunction: saveResultsLambda,
			outputPath: '$.Payload',
		});

		const alarmOnFailuresLambdaTask = new LambdaInvoke(
			this,
			'Alarm on errors',
			{
				lambdaFunction: alarmOnFailuresLambda,
				outputPath: '$.Payload',
			},
		);

		const sendEmailLambdaTask = new LambdaInvoke(this, 'Send email', {
			lambdaFunction: sendEmailLambda,
			outputPath: '$.Payload',
		});

		const subStatusFetcherMap = new Map(this, 'Sub status fetcher map', {
			maxConcurrency: 10,
			itemsPath: JsonPath.stringAt('$.recordsForEmailSend'),
			resultPath: '$.discountProcessingAttempts',
		});

		const expiringDiscountProcessorMap = new Map(
			this,
			'Expiring discount processor map',
			{
				maxConcurrency: 10,
				itemsPath: JsonPath.stringAt('$.discountProcessingAttempts'),
				resultPath: '$.discountProcessingAttempts',
			},
		);

		subStatusFetcherMap.iterator(
			getSubStatusLambdaTask
				.next(getOldPaymentAmountLambdaTask)
				.next(getNewPaymentAmountLambdaTask),
		);
		expiringDiscountProcessorMap.iterator(sendEmailLambdaTask);

		const definitionBody = DefinitionBody.fromChainable(
			getExpiringDiscountsLambdaTask
				.next(filterRecordsLambdaTask)
				.next(subStatusFetcherMap)
				.next(expiringDiscountProcessorMap)
				.next(saveResultsLambdaTask)
				.next(alarmOnFailuresLambdaTask),
		);

		const sqsInlinePolicy: Policy = new Policy(this, 'sqs-inline-policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:GetQueueUrl', 'sqs:SendMessage'],
					resources: [
						`arn:aws:sqs:${this.region}:${this.account}:braze-emails-${this.stage}`,
					],
				}),
			],
		});

		sendEmailLambda.role?.attachInlinePolicy(sqsInlinePolicy);

		const stateMachine = new StateMachine(
			this,
			`${appName}-state-machine-${this.stage}`,
			{
				stateMachineName: `${appName}-${this.stage}`,
				definitionBody: definitionBody,
			},
		);

		const cronEveryDayAtNoon = { minute: '0', hour: '12' };
		const cronOncePerYear = { minute: '0', hour: '0', day: '1', month: '1' };

		const executionFrequency =
			this.stage === 'PROD' ? cronEveryDayAtNoon : cronOncePerYear;

		new Rule(this, 'ScheduleStateMachineRule', {
			schedule: Schedule.cron(executionFrequency),
			targets: [new SfnStateMachine(stateMachine)],
			enabled: true,
		});

		const topic = Topic.fromTopicArn(
			this,
			'Topic',
			`arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`,
		);

		const lambdaFunctionsToAlarmOn = [
			getExpiringDiscountsLambda,
			filterRecordsLambda,
			alarmOnFailuresLambda,
		];

		lambdaFunctionsToAlarmOn.forEach((lambdaFunction, index) => {
			const alarm = new Alarm(this, `alarm-${index}`, {
				alarmName: `Discount Expiry Notifier - ${lambdaFunction.functionName} - something went wrong - ${this.stage}`,
				alarmDescription:
					'Something went wrong when executing the Discount Expiry Notifier. See Cloudwatch logs for more information on the error.',
				datapointsToAlarm: 1,
				evaluationPeriods: 1,
				actionsEnabled: true,
				comparisonOperator:
					aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: Stats.SUM,
					period: Duration.seconds(60),
					dimensionsMap: {
						FunctionName: lambdaFunction.functionName,
					},
				}),
				threshold: 0,
				treatMissingData: TreatMissingData.MISSING,
			});
			alarm.addAlarmAction(new SnsAction(topic));
		});
	}
}
