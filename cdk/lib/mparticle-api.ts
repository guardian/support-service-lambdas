import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
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
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { SrLambda } from './cdk/sr-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class MParticleApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stage,
			app: 'mparticle-api',
		});

		const app = this.app;

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

		const mmaUserDeletionRequestsTopicArn = StringParameter.fromStringParameterName(
			this,
			'MmaUserDeletionRequestsTopicArn',
			`/${this.stage}/${this.stack}/${app}/MmaUserDeletionRequestsTopicArn`,
		).stringValue;

		const sarS3BaseKey = 'mparticle-results/'; // this must be the same as used in the code

		const mmaUserDeletionRequestsDlq = new Queue(this, `${app}-mma-user-deletion-dlq`, {
			queueName: `${app}-mma-user-deletion-requests-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const mmaUserDeletionRequestsQueue = new Queue(this, `${app}-mma-user-deletion-requests-queue`, {
			queueName: `${app}-mma-user-deletion-requests-queue-${this.stage}`,
			deadLetterQueue: {
				queue: mmaUserDeletionRequestsDlq,
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

		// TODO combine this and `apiGateway` to a GuApiLambda (or SR version of)
		const httpLambda = new SrLambda(
			this,
			`${app}-http-lambda`,
			{
				handler: 'index.handlerHttp',
				initialPolicy: [s3BatonReadAndWritePolicy],
			},
			{ nameSuffix: 'http' },
		);

		const batonLambda = new SrLambda(
			this,
			`${app}-baton-lambda`,
			{
				handler: 'index.handlerBaton',
				timeout: Duration.seconds(30), // Longer timeout for data processing
				initialPolicy: [s3BatonReadAndWritePolicy],
			},
			{ nameSuffix: 'baton' },
		);

		const mmaUserDeletionLambda = new SrLambda(
			this,
			`${app}-mma-user-deletion-lambda`,
			{
				app,
				fileName: `${app}.zip`,
				handler: 'index.handlerDeletion',
				functionName: `${app}-deletion-${this.stage}`,
				timeout: Duration.seconds(300),
				initialPolicy: [s3BatonReadAndWritePolicy],
			},
		);

		// Add SQS event source mapping separately since SrLambda doesn't accept events in constructor
		mmaUserDeletionLambda.addEventSource(
			new SqsEventSource(mmaUserDeletionRequestsQueue, {
				reportBatchItemFailures: true,
			}),
		);

		const mmaUserDeletionRequestsTopic = Topic.fromTopicArn(
			this,
			'MmaUserDeletionRequestsTopic',
			mmaUserDeletionRequestsTopicArn,
		);
		mmaUserDeletionRequestsTopic.addSubscription(
			new SqsSubscription(mmaUserDeletionRequestsQueue),
		);

		mmaUserDeletionRequestsQueue.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				principals: [new ServicePrincipal('sns.amazonaws.com')],
				actions: ['sqs:SendMessage'],
				resources: [mmaUserDeletionRequestsQueue.queueArn],
				conditions: {
					ArnEquals: {
						'aws:SourceArn': mmaUserDeletionRequestsTopicArn,
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

			new SrLambdaAlarm(this, 'MParticleMmaUserDeletionLambdaErrorAlarm', {
				app,
				alarmName: 'An error occurred in the mParticle MMA User Deletion Lambda',
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
						FunctionName: mmaUserDeletionLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: mmaUserDeletionLambda.functionName,
			});

			new SrLambdaAlarm(this, 'MParticleMmaUserDeletionDlqAlarm', {
				app,
				alarmName: 'Messages in mParticle MMA User Deletion dead letter queue',
				alarmDescription:
					'There are messages in the mParticle MMA User Deletion DLQ that failed to process. Investigate and redrive if appropriate.',
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: mmaUserDeletionRequestsDlq.metricApproximateNumberOfMessagesVisible(),
				threshold: 1,
				evaluationPeriods: 1,
				lambdaFunctionNames: mmaUserDeletionLambda.functionName,
			});
		}

		const domain = new SrRestDomain(this, apiGateway.api);
		domain.dnsRecord.overrideLogicalId(`MparticleApiDnsRecord`);
		domain.basePathMapping.overrideLogicalId(
			`MparticleApiDomainMparticleApiBasePathMappingA467773E`,
		);
		domain.cfnDomainName.overrideLogicalId(
			`MparticleApiDomainMparticleApiDomainName3EAD2748`,
		);

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
