import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
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

		new Bucket(this, 'Bucket', {
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
				},
				handler: 'getSubsWithExpiringDiscounts.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
			},
		);

		const buildEmailPayloadLambda = new GuLambdaFunction(
			this,
			'build-email-payload-lambda',
			{
				app: appName,
				functionName: `${appName}-build-email-payload-${this.stage}`,
				runtime: nodeVersion,
				environment: {
					Stage: this.stage,
				},
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
				environment: {
					Stage: this.stage,
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
				},
				handler: 'saveResults.handler',
				fileName: `${appName}.zip`,
				architecture: Architecture.ARM_64,
			},
		);

		const getSubsWithExpiringDiscountsLambdaTask = new LambdaInvoke(
			this,
			'Get Subs With Expiring Discounts',
			{
				lambdaFunction: getSubsWithExpiringDiscountsLambda,
				outputPath: '$.Payload',
			},
		);

		const buildEmailPayloadLambdaTask = new LambdaInvoke(
			this,
			'Build Email Payload',
			{
				lambdaFunction: buildEmailPayloadLambda,
				outputPath: '$.Payload',
			},
		);

		const saveResultsLambdaTask = new LambdaInvoke(this, 'Save Results', {
			lambdaFunction: saveResultsLambda,
			outputPath: '$.Payload',
		});

		const initiateEmailSendLambdaTask = new LambdaInvoke(
			this,
			'Initiate Email Send',
			{
				lambdaFunction: initiateEmailSendLambda,
				outputPath: '$.Payload',
			},
		);

		const emailSendsProcessingMap = new Map(this, 'Email Sends Processor Map', {
			maxConcurrency: 10,
			itemsPath: JsonPath.stringAt('$.discountsToProcess'),
			parameters: {
				item: JsonPath.stringAt('$$.Map.Item.Value'),
			},
			resultPath: '$.discountProcessingAttempts',
		});

		emailSendsProcessingMap.iterator(
			buildEmailPayloadLambdaTask.next(initiateEmailSendLambdaTask),
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
