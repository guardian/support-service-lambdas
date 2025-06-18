import {GuApiGatewayWithLambdaByPath} from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';


export class MParticleApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'mparticle-api';
		const lambda = new GuLambdaFunction(this, `${app}-lambda`, {
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

		// API Gateway
		new GuApiGatewayWithLambdaByPath(this, {
			app: "example-api-gateway-instance",
			targets: [
				{
			path: "/data-subject-requests/{requestId}/callback",
			httpMethod: "POST",
			lambda: lambda,
				}
			],
		// Create an alarm
		monitoringConfiguration: {
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			http5xxAlarm: {
				tolerated5xxPercentage: 1,
				}}
		});

		// SQS Queue
		const mparticleCallbackDeadLetterQueue = new Queue(
			this,
			'MparticleApiCallbackDeadLetterQueue',
			{
				queueName: `mparticle-api-callback-dead-letter-queue-${this.stage}`,
				retentionPeriod: Duration.seconds(864000),
			},
		);

		new Queue(this, 'MparticleCallbackQueue', {
			queueName: `mparticle-callback-queue-${this.stage}`,
			visibilityTimeout: Duration.seconds(3000),
			deadLetterQueue: {
				maxReceiveCount: 3,
				queue: mparticleCallbackDeadLetterQueue,
			},
		});

		lambda.role?.attachInlinePolicy(
			new Policy(this, `${app}-cloudwatch-policy`, {
				statements: [
					new PolicyStatement({
						actions: ['cloudwatch:ListTagsForResource'],
						resources: ['*'],
					}),
				],
			}),
		);

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
