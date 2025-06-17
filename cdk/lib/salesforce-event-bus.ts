import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';

import { nodeVersion } from './node-version';

export class SalesforceEventBus extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-event-bus';

		new GuLambdaFunction(this, 'SalesforceEventBusPlaceholder', {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(300),
			handler: 'salesforceEventBusPlaceholder.handler',
			functionName: `salesforce-event-bus-placeholder-${this.stage}`,
		});
	}
}
