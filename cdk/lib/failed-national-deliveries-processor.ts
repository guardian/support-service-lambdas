import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class FailedNationalDeliveriesProcessor extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'failed-national-deliveries-processor';
		const nationalFailedDeliveryLambda = new GuScheduledLambda(
			this,
			'failed-national-deliveries-processor',
			{
				description: 'A lambda to process failed national deliveries',
				functionName: `failed-national-deliveries-processor-${this.stage}`,
				handler: 'failed-national-deliveries-processor/index.main',
				runtime: Runtime.NODEJS_18_X,
				memorySize: 1024,
				fileName: `failed-national-deliveries-processor.zip`,
				app: app,
				rules: [],
				monitoringConfiguration: { noMonitoring: true },
			},
		);
	}
}
