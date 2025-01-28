import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
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
				handler: 'getSubsWithExpiringDiscounts.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
				role,
			},
		);

		const subIsActiveLambda = new GuLambdaFunction(
			this,
			'sub-is-active-lambda',
			{
				app: appName,
				functionName: `${appName}-sub-is-active-${this.stage}`,
				runtime: nodeVersion,
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

		const buildEmailPayloadLambda = new GuLambdaFunction(
			this,
			'build-email-payload-lambda',
			{
				app: appName,
				functionName: `${appName}-build-email-payload-${this.stage}`,
				runtime: nodeVersion,
				handler: 'buildEmailPayload.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
			},
		);

		const initiateEmailSendLambda = new GuLambdaFunction(
			this,
			'initiate-email-send-lambda',
			{
				app: appName,
				functionName: `${appName}-initiate-email-send-${this.stage}`,
				runtime: nodeVersion,
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

		const subIsActiveLambdaTask = new LambdaInvoke(
			this,
			'Check sub is active',
			{
				lambdaFunction: subIsActiveLambda,
				outputPath: '$.Payload',
			},
		);

		const buildEmailPayloadLambdaTask = new LambdaInvoke(
			this,
			'Build email payload',
			{
				lambdaFunction: buildEmailPayloadLambda,
				outputPath: '$.Payload',
			},
		);

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

		const emailSendsProcessingMap = new Map(this, 'Email sends processor map', {
			maxConcurrency: 10,
			itemsPath: JsonPath.stringAt('$.expiringDiscountsToProcess'),
			parameters: {
				item: JsonPath.stringAt('$$.Map.Item.Value'),
			},
			resultPath: '$.discountProcessingAttempts',
		});

		const isSubActiveChoice = new Choice(this, 'Is Subscription Active?');

		emailSendsProcessingMap.iterator(
			subIsActiveLambdaTask.next(
				isSubActiveChoice
					.when(
						Condition.stringEquals('$.status', 'Active'),
						buildEmailPayloadLambdaTask.next(initiateEmailSendLambdaTask),
					)
					.otherwise(
						new Pass(this, 'Skip Processing', { resultPath: JsonPath.DISCARD }),
					),
			),
		);

		const definitionBody = DefinitionBody.fromChainable(
			getSubsWithExpiringDiscountsLambdaTask
				.next(emailSendsProcessingMap)
				.next(saveResultsLambdaTask),
		);

		new StateMachine(this, `${appName}-state-machine-${this.stage}`, {
			stateMachineName: `${appName}-${this.stage}`,
			definitionBody: definitionBody,
		});
	}
}
