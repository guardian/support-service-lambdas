import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { aws_cloudwatch, Duration } from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import {
	Alarm,
	Metric,
	Stats,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	Choice,
	Condition,
	DefinitionBody,
	JsonPath,
	Map,
	Pass,
	StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class ZuoraSalesforceLinkRemover extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'zuora-salesforce-link-remover';

		const allowPutMetric = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['cloudwatch:PutMetricData'],
			resources: ['*'],
		});

		const getSalesforceBillingAccountsLambda = new GuLambdaFunction(
			this,
			'get-billing-accounts-lambda',
			{
				app: appName,
				functionName: `${appName}-get-billing-accounts-${this.stage}`,
				runtime: Runtime.NODEJS_20_X,
				environment: {
					Stage: this.stage,
				},
				handler: 'getBillingAccounts.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:DEV/Salesforce/ConnectedApp/AwsConnectorSandbox-oO8Phf`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:DEV/Salesforce/User/integrationapiuser-rvxxrG`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/Salesforce/ConnectedApp/BillingAccountRemover-WUdrKa`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/Salesforce/User/BillingAccountRemoverAPIUser-UJ1SwZ`,
						],
					}),
					allowPutMetric,
				],
			},
		);

		const updateZuoraBillingAccountLambda = new GuLambdaFunction(
			this,
			'update-zuora-billing-account-lambda',
			{
				app: appName,
				functionName: `${appName}-update-zuora-billing-account-${this.stage}`,
				runtime: Runtime.NODEJS_20_X,
				environment: {
					Stage: this.stage,
				},
				handler: 'updateZuoraBillingAccount.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:CODE/Zuora-OAuth/SupportServiceLambdas-S8QM4l`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/Zuora-OAuth/SupportServiceLambdas-Iu3KIT`,
						],
					}),
					allowPutMetric,
				],
			},
		);

		const updateSfBillingAccountsLambda = new GuLambdaFunction(
			this,
			'update-sf-billing-accounts-lambda',
			{
				app: appName,
				functionName: `${appName}-update-sf-billing-accounts-${this.stage}`,
				runtime: Runtime.NODEJS_20_X,
				environment: {
					Stage: this.stage,
				},
				handler: 'updateSfBillingAccounts.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:DEV/Salesforce/ConnectedApp/AwsConnectorSandbox-oO8Phf`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:DEV/Salesforce/User/integrationapiuser-rvxxrG`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/Salesforce/ConnectedApp/BillingAccountRemover-WUdrKa`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/Salesforce/User/BillingAccountRemoverAPIUser-UJ1SwZ`,
						],
					}),
					allowPutMetric,
				],
			},
		);

		const getSalesforceBillingAccountsFromLambdaTask = new LambdaInvoke(
			this,
			'Get Salesforce Billing Accounts',
			{
				lambdaFunction: getSalesforceBillingAccountsLambda,
				outputPath: '$.Payload',
			},
		);

		const updateZuoraBillingAccountLambdaTask = new LambdaInvoke(
			this,
			'Update Zuora Billing Account',
			{
				lambdaFunction: updateZuoraBillingAccountLambda,
				outputPath: '$.Payload',
			},
		);

		const updateSfBillingAccountsLambdaTask = new LambdaInvoke(
			this,
			'Update Salesforce Billing Accounts',
			{
				lambdaFunction: updateSfBillingAccountsLambda,
				inputPath: '$.billingAccountProcessingAttempts',
				outputPath: '$.Payload',
			},
		);

		const billingAccountsProcessingMap = new Map(
			this,
			'Billing Accounts Processor Map',
			{
				maxConcurrency: 10,
				itemsPath: JsonPath.stringAt('$.billingAccountsToProcess'),
				itemSelector: {
					item: JsonPath.stringAt('$$.Map.Item.Value'),
				},
				resultPath: '$.billingAccountProcessingAttempts',
			},
		);

		const billingAccountsProcessingMapDefinition =
			updateZuoraBillingAccountLambdaTask;

		billingAccountsProcessingMap.itemProcessor(
			billingAccountsProcessingMapDefinition,
		);

		const billingAccountsExistChoice = new Choice(
			this,
			'Billing Accounts exist for processing?',
		)
			.when(
				Condition.isPresent('$.billingAccountsToProcess[0]'),
				billingAccountsProcessingMap.next(updateSfBillingAccountsLambdaTask),
			)
			.otherwise(new Pass(this, 'No Billing Accounts to process'));

		const definitionBody = DefinitionBody.fromChainable(
			getSalesforceBillingAccountsFromLambdaTask.next(
				billingAccountsExistChoice,
			),
		);

		const stateMachine = new StateMachine(
			this,
			`zuora-salesforce-link-remover-state-machine-${this.stage}`,
			{
				definitionBody: definitionBody,
			},
		);

		const cronEveryHour = { minute: '0', hour: '*' };
		const cronOncePerYear = { minute: '0', hour: '0', day: '1', month: '1' };
		const executionFrequency =
			this.stage === 'PROD' ? cronEveryHour : cronOncePerYear;

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

		const lambdaFunctions = [
			getSalesforceBillingAccountsLambda,
			updateZuoraBillingAccountLambda,
			updateSfBillingAccountsLambda,
		];

		lambdaFunctions.forEach((lambdaFunction, index) => {
			const alarm = new Alarm(this, `alarm-${index}`, {
				alarmName: `Zuora <-> Salesforce link remover - ${lambdaFunction.functionName} - something went wrong - ${this.stage}`,
				alarmDescription:
					'Something went wrong when executing the zuora <-> salesforce link remover. See Cloudwatch logs for more information on the error.',
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
