import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { nodeVersion } from './node-version';

export class DpTestLambda extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'dp-test-lambda';

		const allowPutMetric = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['cloudwatch:PutMetricData'],
			resources: ['*'],
		});

		new GuLambdaFunction(this, 'invoke-zuora-lambda', {
			app: appName,
			functionName: `${appName}-invoke-zuora-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			runtime: nodeVersion,
			environment: {
				Stage: this.stage,
			},
			handler: 'invokeZuora.handler',
			fileName: `${appName}.zip`,
			architecture: Architecture.ARM_64,
			initialPolicy: [
				allowPutMetric,
				new PolicyStatement({
					actions: ['secretsmanager:GetSecretValue'],
					resources: [
						`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
					],
				}),
			],
		});
	}
}
