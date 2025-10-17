import { GuPutCloudwatchMetricsPolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ApiGatewayToSqs } from './cdk/ApiGatewayToSqs';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class TicketTailorWebhook extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'ticket-tailor-webhook', stage });

		const lambda = new SrSqsLambda(this, 'Lambda', {
			monitoring: { errorImpact: 'unknown' },
			lambdaOverrides: {
				description:
					'An API Gateway triggered lambda generated in the support-service-lambdas repo',
				timeout: Duration.minutes(5),
			},
			maxReceiveCount: 5,
			// This must be >= the lambda timeout
			visibilityTimeout: Duration.minutes(5),
			legacyId: `${this.app}-lambda`,
			legacyQueueIds: {
				queue: `${this.app}-queue-${this.stage}`,
				dlq: `${this.app}-dlq-${this.stage}`,
			},
		});

		lambda.addPolicies(
			getSecretManagerAccessPolicy(this),
			new GuPutCloudwatchMetricsPolicy(this),
		);

		new ApiGatewayToSqs(this, 'ApiGatewayToSqs', {
			queue: lambda.inputQueue,
			includeHeaderNames: ['tickettailor-webhook-signature'],
		});
	}
}

function getSecretManagerAccessPolicy(scope: SrStack) {
	return new Policy(scope, 'Secret manager access policy', {
		statements: [
			new PolicyStatement({
				actions: ['secretsmanager:GetSecretValue'],
				resources: [
					`arn:aws:secretsmanager:${scope.region}:${scope.account}:secret:${scope.stage}/TicketTailor/Webhook-validation-*`,
					`arn:aws:secretsmanager:${scope.region}:${scope.account}:secret:${scope.stage}/TicketTailor/IdApi-token-*`,
				],
			}),
		],
	});
}
