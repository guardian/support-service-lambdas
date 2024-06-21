import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';


export class ZuoraSalesforceLinkRemover extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'zuora-salesforce-link-remover';

		new GuLambdaFunction(this, 'get-billing-accounts-lambda', {
			app: appName,
			functionName: `${appName}-get-billing-accounts-lambda-${this.stage}`,
			runtime: Runtime.NODEJS_20_X,
			handler: 'getBillingAccounts.handler',
			fileName: `${appName}.zip`,
		});
	}
}

// make a test file
// make a snapshot file jest --u
// run pnpm
