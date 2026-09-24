import type { App } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SrLambda } from './cdk/SrLambda';
import { SrStack } from './cdk/SrStack';

const app = 'send-test-data-to-mparticle';

export class SendTestDataToMparticle extends SrStack {
	constructor(scope: App, stage: 'CODE') {
		super(scope, { stage, app });

		const lambda = new SrLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Posts manually supplied test profile data to the mParticle development environment',
			},
		});

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['ssm:GetParameter'],
				resources: [
					`arn:aws:ssm:${this.region}:${this.account}:parameter/CODE/support/mparticle-api/inputPlatform/key`,
					`arn:aws:ssm:${this.region}:${this.account}:parameter/CODE/support/mparticle-api/inputPlatform/secret`,
				],
			}),
		);
	}
}
