import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
// import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { nodeVersion } from './node-version';

export class MParticleApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'mparticle-api';
		// const lambda = new GuLambdaFunction(this, `${app}-lambda`, {
		new GuLambdaFunction(this, `${app}-lambda`, {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(15),
			handler: 'index.handler',
			functionName: `${app}-${this.stage}`,
			events: [],
			environment: {
				APP: app,
				STACK: this.stack,
				STAGE: this.stage,
			},
		});

		// lambda.role?.attachInlinePolicy(
		// 	new Policy(this, `${app}-cloudwatch-policy`, {
		// 		statements: [
		// 			new PolicyStatement({
		// 				actions: ['cloudwatch:ListTagsForResource'],
		// 				resources: ['*'],
		// 			}),
		// 		],
		// 	}),
		// );

		// Allow the lambda to assume the roles that allow cross-account fetching of tags
		// lambda.addToRolePolicy(
		// 	new PolicyStatement({
		// 		actions: ['sts:AssumeRole'],
		// 		effect: Effect.ALLOW,
		// 		resources: [
		// 			// mobileAccountRoleArn.valueAsString,
		// 			// targetingAccountRoleArn.valueAsString,
		// 		],
		// 	}),
		// );
	}
}
