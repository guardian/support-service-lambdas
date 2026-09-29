import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import {
	AllowGetSecretValuePolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrAppConfigKey } from './cdk/SrAppConfigKey';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class IdentityDeletionCleanup extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'identity-deletion-cleanup' });

		const identityMmaSnsDeletionRequestTopicArn = new SrAppConfigKey(
			this,
			'identityMmaSnsDeletionRequestTopicArn',
		).valueAsString;

		const lambda = new SrSqsLambda(this, 'Lambda', {
			maxReceiveCount: 3,
			visibilityTimeout: Duration.minutes(6),
			monitoring: {
				errorImpact:
					'a deleted Identity ID may remain on Salesforce Contacts or Zuora Customer Accounts',
			},
			lambdaOverrides: {
				architecture: Architecture.ARM_64,
				description:
					'Clears deleted Identity IDs from matching Salesforce Contacts and Zuora Customer Accounts',
				timeout: Duration.minutes(5),
			},
		});

		lambda.addPolicies(
			new AllowGetSecretValuePolicy(
				this,
				'Allow Salesforce Identity deletion cleanup secret',
				'Salesforce/ConnectedApp/IdentityDeletionCleanup-*',
			),
			new AllowZuoraOAuthSecretsPolicy(this),
		);

		lambda.inputQueue.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				principals: [new ServicePrincipal('sns.amazonaws.com')],
				actions: ['sqs:SendMessage'],
				resources: [lambda.inputQueue.queueArn],
				conditions: {
					ArnEquals: {
						'aws:SourceArn': identityMmaSnsDeletionRequestTopicArn,
					},
				},
			}),
		);
	}
}
