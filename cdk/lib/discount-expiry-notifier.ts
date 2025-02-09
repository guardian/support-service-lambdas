import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import {
	Effect,
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
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

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${appName}-${this.stage.toLowerCase()}`,
		});

		const getSubsWithExpiringDiscountsLambda = new GuLambdaFunction(
			this,
			'get-subs-with-expiring-discounts-lambda',
			{
				app: appName,
				functionName: `${appName}-get-subs-with-expiring-discounts-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
					DAYS_UNTIL_DISCOUNT_EXPIRY_DATE: '32',
				},
				handler: 'getSubsWithExpiringDiscounts.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				role,
			},
		);
		const filterSubsLambda = new GuLambdaFunction(this, 'filter-subs-lambda', {
			app: appName,
			functionName: `${appName}-filter-subs-${this.stage}`,
			runtime: nodeVersion,
			environment: {
				Stage: this.stage,
				FILTER_BY_REGIONS: 'US,USA,United States,United States of America',
			},
			handler: 'filterSubs.handler',
			fileName: `${appName}.zip`,
			architecture: Architecture.ARM_64,
		});

		const getSubStatusLambda = new GuLambdaFunction(
			this,
			'sub-is-active-lambda',
			{
				app: appName,
				functionName: `${appName}-sub-is-active-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
				},
				handler: 'subIsActive.handler',
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

		const initiateEmailSendLambda = new GuLambdaFunction(
			this,
			'initiate-email-send-lambda',
			{
				app: appName,
				functionName: `${appName}-initiate-email-send-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
					S3_BUCKET: bucket.bucketName,
				},
				handler: 'initiateEmailSend.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
			},
		);

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
				],
			},
		);

		const getSubsWithExpiringDiscountsLambdaTask = new LambdaInvoke(
			this,
			'Get subs with expiring discounts',
			{
				lambdaFunction: getSubsWithExpiringDiscountsLambda,
				outputPath: '$.Payload',
			},
		);

		const filterSubsLambdaTask = new LambdaInvoke(
			this,
			'Filter subs by region',
			{
				lambdaFunction: filterSubsLambda,
				outputPath: '$.Payload',
			},
		);

		const getSubStatusLambdaTask = new LambdaInvoke(this, 'Get sub status', {
			lambdaFunction: getSubStatusLambda,
			outputPath: '$.Payload',
		});

		const saveResultsLambdaTask = new LambdaInvoke(this, 'Save results', {
			lambdaFunction: saveResultsLambda,
			outputPath: '$.Payload',
		});

		const initiateEmailSendLambdaTask = new LambdaInvoke(
			this,
			'Initiate email send',
			{
				lambdaFunction: initiateEmailSendLambda,
				outputPath: '$.Payload',
			},
		);

		const subStatusFetcherMap = new Map(this, 'Sub status fetcher map', {
			maxConcurrency: 10,
			itemsPath: JsonPath.stringAt('$.filteredSubs'),
			parameters: {
				item: JsonPath.stringAt('$$.Map.Item.Value'),
			},
			resultPath: '$.discountProcessingAttempts',
		});

		const expiringDiscountProcessorMap = new Map(
			this,
			'Expiring discount processor map',
			{
				maxConcurrency: 10,
				itemsPath: JsonPath.stringAt('$.discountProcessingAttempts'),
				parameters: {
					item: JsonPath.stringAt('$$.Map.Item.Value'),
				},
				resultPath: '$.discountProcessingAttempts',
			},
		);

		subStatusFetcherMap.iterator(getSubStatusLambdaTask);
		expiringDiscountProcessorMap.iterator(initiateEmailSendLambdaTask);

		const definitionBody = DefinitionBody.fromChainable(
			getSubsWithExpiringDiscountsLambdaTask
				.next(filterSubsLambdaTask)
				.next(subStatusFetcherMap)
				.next(expiringDiscountProcessorMap)
				.next(saveResultsLambdaTask),
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

		initiateEmailSendLambda.role?.attachInlinePolicy(sqsInlinePolicy);

		new StateMachine(this, `${appName}-state-machine-${this.stage}`, {
			stateMachineName: `${appName}-${this.stage}`,
			definitionBody: definitionBody,
		});
	}
}
