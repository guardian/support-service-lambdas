import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import {
	AccountPrincipal,
	Effect,
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { SrLambda } from './cdk/sr-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrLambdaDomain } from './cdk/sr-lambda-domain';
import { nodeVersion } from './node-version';

export class MParticleApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'mparticle-api';

		const batonAccountId = StringParameter.fromStringParameterName(
			this,
			'BatonAccountId',
			'/accountIds/baton',
		).stringValue;

		const sarResultsBucket = StringParameter.fromStringParameterName(
			this,
			'SarResultsBucket',
			`/${this.stage}/${this.stack}/${app}/sarResultsBucket`,
		).stringValue;

		const deletionRequestsTopicArn = StringParameter.fromStringParameterName(
			this,
			'DeletionRequestsTopicArn',
			`/${this.stage}/${this.stack}/${app}/deletionRequestsTopicArn`,
		).stringValue;

		const sarS3BaseKey = 'mparticle-results/';

		const deletionDlq = new Queue(this, `${app}-deletion-dlq`, {
			queueName: `${app}-deletion-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const deletionRequestsQueue = new Queue(this, `${app}-deletion-queue`, {
			queueName: `${app}-deletion-queue-${this.stage}`,
			deadLetterQueue: {
				queue: deletionDlq,
				maxReceiveCount: 3,
			},
			visibilityTimeout: Duration.seconds(300), // Should match lambda timeout
		});

		// make sure our lambdas can write to and list objects in the central baton bucket
		// https://github.com/guardian/baton/?tab=readme-ov-file#:~:text=The%20convention%20is%20to%20write%20these%20to%20the%20gu%2Dbaton%2Dresults%20bucket%20that%20is%20hosted%20in%20the%20baton%20AWS%20account.
		// s3:ListBucket permission is needed to check if files already exist before downloading
		const s3BatonReadAndWritePolicy: PolicyStatement = new PolicyStatement({
			actions: ['s3:PutObject', 's3:ListBucket'],
			resources: [
				`arn:aws:s3:::${sarResultsBucket}/${sarS3BaseKey}*`, // for PutObject
				`arn:aws:s3:::${sarResultsBucket}`, // for ListBucket
			],
		});

		const httpLambda = new SrLambda(this, `${app}-http-lambda`, {
			app,
			fileName: `${app}.zip`,
			handler: 'index.handlerHttp',
			functionName: `${app}-http-${this.stage}`,
			initialPolicy: [s3BatonReadAndWritePolicy],
		});

		const batonLambda = new SrLambda(this, `${app}-baton-lambda`, {
			app,
			fileName: `${app}.zip`,
			handler: 'index.handlerBaton',
			functionName: `${app}-baton-${this.stage}`,
			timeout: Duration.seconds(30), // Longer timeout for data processing
			initialPolicy: [s3BatonReadAndWritePolicy],
		});

		const deletionLambda = new GuLambdaFunction(
			this,
			`${app}-deletion-lambda`,
			{
				app,
				memorySize: 1024,
				fileName: `${app}.zip`,
				runtime: nodeVersion,
				loggingFormat: LoggingFormat.TEXT,
				handler: 'index.handlerDeletion',
				functionName: `${app}-deletion-${this.stage}`,
				timeout: Duration.seconds(300),
				initialPolicy: [s3BatonReadAndWritePolicy],
				events: [
					new SqsEventSource(deletionRequestsQueue, {
						reportBatchItemFailures: true,
					}),
				],
			},
		);

		const deletionRequestsTopic = Topic.fromTopicArn(
			this,
			'DeletionRequestsTopic',
			deletionRequestsTopicArn,
		);
		deletionRequestsTopic.addSubscription(
			new SqsSubscription(deletionRequestsQueue),
		);

		deletionRequestsQueue.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				principals: [new ServicePrincipal('sns.amazonaws.com')],
				actions: ['sqs:SendMessage'],
				resources: [deletionRequestsQueue.queueArn],
				conditions: {
					ArnEquals: {
						'aws:SourceArn': deletionRequestsTopicArn,
					},
				},
			}),
		);

		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app: app,
			targets: [
				{
					path: '/data-subject-requests/{requestId}/callback',
					httpMethod: 'POST',
					lambda: httpLambda,
				},
			],
			monitoringConfiguration: {
				noMonitoring: true,
			},
		});

		if (this.stage === 'PROD') {
			// API Gateway 5XX alarm
			new SrLambdaAlarm(this, 'MParticleApiGateway5XXAlarm', {
				app,
				alarmName: 'API gateway 5XX response',
				alarmDescription:
					'mParticle API callback returned a 500 response, please check the logs.',
				evaluationPeriods: 1,
				threshold: 1,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						ApiName: `${app}-apiGateway`,
					},
				}),
				lambdaFunctionNames: httpLambda.functionName,
			});

			// HTTP Lambda error alarm
			new SrLambdaAlarm(this, 'MParticleHttpLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle HTTP Lambda',
				alarmDescription:
					'mParticle HTTP Lambda failed, please check the logs to diagnose the issue.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						FunctionName: httpLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: httpLambda.functionName,
			});

			// Baton Lambda error alarm
			new SrLambdaAlarm(this, 'MParticleBatonLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle Baton Lambda',
				alarmDescription:
					'Impact: a user may not be deleted from mParticle+Braze after an erasure request, and Baton would display an error.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						FunctionName: batonLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: batonLambda.functionName,
			});

			new SrLambdaAlarm(this, 'MParticleDeletionLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle Deletion Lambda',
				alarmDescription:
					'Impact: a user deletion request may not have been processed successfully. Check the dead letter queue and lambda logs.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.hours(24),
					dimensionsMap: {
						FunctionName: deletionLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: deletionLambda.functionName,
			});

			new SrLambdaAlarm(this, 'MParticleDeletionDlqAlarm', {
				app,
				alarmName: 'Messages in mParticle deletion dead letter queue',
				alarmDescription:
					'There are messages in the mParticle deletion DLQ that failed to process. Investigate and redrive if appropriate.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: deletionDlq.metricApproximateNumberOfMessagesVisible(),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: deletionLambda.functionName,
			});
		}

		new SrLambdaDomain(this, {
			subdomain: 'mparticle-api',
			restApi: apiGateway.api,
		});

		/**
		 * Export Lambda role ARN for cross-account queue access.
		 * The SQS queue policy in account "Ophan" imports this ARN
		 * to grant this Lambda sqs:SendMessage permissions to the erasure queue.
		 * We grant the permission so baton can call the lambdas directly as per:
		 * https://github.com/guardian/baton?tab=readme-ov-file#adding-data-sources-to-baton
		 * https://github.com/guardian/baton-lambda-template/blob/61ebdec91bd53e218d5f5a2aa90494db69adfa0a/src/main/g8/cfn.yaml#L44-L46
		 */
		const batonInvokeRole = new Role(this, 'BatonInvokeRole', {
			roleName: `baton-mparticle-lambda-role-${this.stage}`,
			assumedBy: new AccountPrincipal(batonAccountId),
		});
		batonInvokeRole.attachInlinePolicy(
			new Policy(this, 'BatonRunLambdaPolicy', {
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['lambda:InvokeFunction'],
						resources: [batonLambda.functionArn], // Only Baton Lambda needs to be invokable
					}),
				],
			}),
		);
	}
}
