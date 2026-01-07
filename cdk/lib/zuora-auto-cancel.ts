import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, CfnEventSourceMapping, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ApiGatewayToSqs } from './cdk/ApiGatewayToSqs';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ZuoraAutoCancel extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'zuora-auto-cancel', stack: 'membership', stage });

		const errorImpact =
			'Zuora auto-cancellations are not being processed. Subscriptions with failed payments may not be cancelled.';

		// SQS-triggered Lambda using SrCDK with Java overrides
		const lambda = new SrSqsLambda(this, 'Lambda', {
			monitoring: { errorImpact },
			maxReceiveCount: 3,
			visibilityTimeout: Duration.minutes(6), // Must be > Lambda timeout
			lambdaOverrides: {
				description:
					'Processes auto-cancellation requests from SQS queue (rate-limited)',
				fileName: 'zuora-callout-apis.jar',
				handler: 'com.gu.autoCancel.AutoCancelSqsHandler::handleRequest',
				runtime: Runtime.JAVA_21,
				architecture: Architecture.ARM_64,
				memorySize: 1536,
				timeout: Duration.minutes(5),
				environment: {
					Stage: this.stage,
				},
			},
		});

		// Add maxConcurrency to the event source mapping to limit concurrent Zuora API calls
		// SrSqsLambda creates an event source with batchSize: 1, we need to add ScalingConfig
		lambda.node.findAll().forEach((child) => {
			const cfnResource = child.node.defaultChild;
			if (cfnResource instanceof CfnEventSourceMapping) {
				cfnResource.scalingConfig = { maximumConcurrency: 5 };
			}
		});

		// IAM Policies
		lambda.addPolicies(
			new Policy(this, 'ReadPrivateCredentials', {
				statements: [
					new PolicyStatement({
						actions: ['s3:GetObject'],
						resources: [
							`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/zuoraRest-${this.stage}.*.json`,
							`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/trustedApi-${this.stage}.*.json`,
							`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/exactTarget-${this.stage}.*.json`,
							`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/stripe-${this.stage}.*.json`,
						],
					}),
				],
			}),
			new Policy(this, 'SQSSendToEmailQueue', {
				statements: [
					new PolicyStatement({
						actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
						resources: [
							`arn:aws:sqs:${this.region}:${this.account}:comms-${this.stage}-EmailQueue`,
						],
					}),
				],
			}),
		);

		// API Gateway -> SQS integration (replaces the AutoCancelQueueWriter lambda)
		new ApiGatewayToSqs(this, 'ApiGatewayToSqs', {
			queue: lambda.inputQueue,
			monitoring: { errorImpact },
		});
	}
}
