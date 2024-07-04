import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class ZuoraSalesforceLinkRemover extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'zuora-salesforce-link-remover';

		const getSalesforceBillingAccountsLambda = new GuLambdaFunction(this, 'get-billing-accounts-lambda', {
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
					],
				}),
			],
		});

		const updateZuoraBillingAccountsLambda = new GuLambdaFunction(this, 'update-zuora-billing-account-lambda', {
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
						`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/Zuora/SupportServiceLambdas-WeibUa`,
					],
				}),
			],
		});

		new GuLambdaFunction(this, 'update-sf-billing-accounts-lambda', {
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
					],
				}),
			],
		});
		
		const getSalesforceBillingAccountsFromLambdaTask = new LambdaInvoke(this, 'Get Salesforce Billing Accounts', {
			lambdaFunction: getSalesforceBillingAccountsLambda,
			outputPath: '$.Payload',
		});
		
		const updateZuoraBillingAccountsLambdaTask = new LambdaInvoke(this, 'Update Zuora Billing Accounts', {
			lambdaFunction: updateZuoraBillingAccountsLambda,
			outputPath: '$.Payload',
		});

		const stateMachineDefinition = getSalesforceBillingAccountsFromLambdaTask
		.next(updateZuoraBillingAccountsLambdaTask);
		
		const stateMachine = new StateMachine(this, `zuora-salesforce-link-remover-state-machine-${this.stage}`, {
			stateMachineDefinition,
		});
	}
}
