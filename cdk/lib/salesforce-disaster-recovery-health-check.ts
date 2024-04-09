import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface Props extends GuStackProps {}

export class SalesforceDisasterRecoveryHealthCheck extends GuStack {
	constructor(scope: App, id: string, props: Props) {
		super(scope, id, props);

		const app = 'salesforce-disaster-recovery-health-check';

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.minutes(5),
			environment: { APP: app, STACK: this.stack, STAGE: this.stage },
		};

		new GuLambdaFunction(this, 'SaveSalesforceQueryResultToS3Lambda', {
			...lambdaDefaultConfig,
			handler: 'salesforceDisasterRecoveryHealthCheck.handler',
			functionName: `${app}-${this.stage}`,
		});
	}
}
