import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class DiscountExpiryNotifier extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'discount-expiry-notifier';

		const bucket = new Bucket(this, 'Bucket', {
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

		const getSubsWithExpiringDiscountsLambdaTask = new LambdaInvoke(
			this,
			'Get Subs With Expiring Discounts',
			{
				lambdaFunction: getSubsWithExpiringDiscountsLambda,
				outputPath: '$.Payload',
			},
		);

		const definitionBody = DefinitionBody.fromChainable(
			getSubsWithExpiringDiscountsLambdaTask,
		);

		new StateMachine(this, `${appName}-state-machine-${this.stage}`, {
			stateMachineName: `${appName}-${this.stage}`,
			definitionBody: definitionBody,
		});
	}
}
