import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

const appName = 'zuora-salesforce-link-remover';

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		new GuLambdaFunction(
			this,
			'get-billing-accounts-lambda',
			{
				app: appName,
				functionName: `${appName}-get-billing-accounts-lambda-${this.stage}`,
				runtime: Runtime.NODEJS_20_X,
				handler: 'getBillingAccounts.handler',
				fileName: `${appName}.zip`,
			}
		)
	}
	
}
