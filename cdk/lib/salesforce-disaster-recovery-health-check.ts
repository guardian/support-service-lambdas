import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { type GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
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

		new GuScheduledLambda(this, 'salesforce-disaster-recovery-health-check', {
			...lambdaDefaultConfig,
			handler: 'dist/lambda/main.handler',
			functionName: `${app}-${this.stage}`,
			rules: [{ schedule: Schedule.cron({ minute: '0', hour: '9' }) }],
			monitoringConfiguration: { noMonitoring: true },
		});
	}
}
