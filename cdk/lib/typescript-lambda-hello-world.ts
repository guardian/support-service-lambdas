//import { join } from 'path';
import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class TypescriptLambdaHelloWorld extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'typescript-lambda-hello-world';
		const nationalDeliveryFulfilmentLambda = new GuScheduledLambda(
			this,
			'typescript-lambda-hello-world',
			{
				description: 'A first effort at making a typescript lamba',
				functionName: `membership-typescript-lambda-hello-world-DEV`,
				handler: 'typescript-lambda-hello-world/index.main',
				runtime: Runtime.NODEJS_18_X,
				memorySize: 1024,
				fileName: `typescript-lambda-hello-world.zip`,
				app: app,
				rules: [],
				monitoringConfiguration: { noMonitoring: true },
			},
		);
	}
}