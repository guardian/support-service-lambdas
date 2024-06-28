import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';

export class ZuoraSalesforceLinkRemover extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'zuora-salesforce-link-remover';

		new GuLambdaFunction(this, 'get-billing-accounts-lambda', {
			app: appName,
			functionName: `${appName}-get-billing-accounts-${this.stage}`,
			runtime: Runtime.NODEJS_20_X,
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

		new GuLambdaFunction(this, 'update-zuora-billing-accounts-lambda', {
			app: appName,
			functionName: `${appName}-update-zuora-billing-accounts-${this.stage}`,
			runtime: Runtime.NODEJS_20_X,
			environment: {
				APP: appName,
				STACK: this.stack,
				STAGE: this.stage,
				ZUORABILLINGACCOUNTID: 'abc',
			},
			handler: 'updateZuoraBillingAccounts.handler',
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
	}
}
