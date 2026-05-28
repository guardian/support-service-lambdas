import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	Alarm,
	ComparisonOperator,
	MathExpression,
	Metric,
	TreatMissingData,
	Unit,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import {
	Effect,
	PolicyDocument,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import {
	Choice,
	Condition,
	DefinitionBody,
	StateMachine,
	Succeed,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';

type SupporterProductDataLambdasProps = GuStackProps & {
	processItemMaxConcurrency: number;
};

export class SupporterProductDataLambdas extends GuStack {
	constructor(scope: App, id: string, props: SupporterProductDataLambdasProps) {
		super(scope, id, props);

		const { processItemMaxConcurrency } = props;

		const artifactBucket = Bucket.fromBucketName(
			this,
			'SupporterProductDataLambdasDistBucket',
			'membership-dist',
		);

		const lambdaArtifact = Code.fromBucket(
			artifactBucket,
			`support/${this.stage}/supporter-product-data-lambdas/supporter-product-data-lambdas.zip`,
		);

		const lambdaRole = new Role(this, 'SupporterProductDataLambdaRole', {
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			inlinePolicies: {
				LambdaPermissions: new PolicyDocument({
					statements: [
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								'logs:CreateLogGroup',
								'logs:CreateLogStream',
								'logs:PutLogEvents',
							],
							resources: ['*'],
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								'ssm:GetParametersByPath',
								'ssm:GetParameter',
								'ssm:PutParameter',
							],
							resources: [
								`arn:aws:ssm:${this.region}:${this.account}:parameter/supporter-product-data/${this.stage}/*`,
							],
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: ['s3:PutObject', 's3:GetObject'],
							resources: [
								`arn:aws:s3:::supporter-product-data-export-${this.stage.toLowerCase()}/*`,
							],
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								'dynamodb:UpdateItem',
								'dynamodb:PutItem',
								'dynamodb:GetItem',
							],
							resources: [
								`arn:aws:dynamodb:${this.region}:${this.account}:table/SupporterProductData-${this.stage}`,
							],
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: ['cloudwatch:PutMetricData'],
							resources: ['*'],
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: ['secretsmanager:GetSecretValue'],
							resources: [
								`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas*`,
							],
						}),
					],
				}),
			},
		});

		const queryZuora = new Function(this, 'QueryZuoraLambda', {
			functionName: `supporterProductData-QueryZuora-${this.stage}`,
			runtime: Runtime.NODEJS_22_X,
			handler: 'queryZuoraLambda.handler',
			code: lambdaArtifact,
			timeout: Duration.minutes(5),
			memorySize: 512,
			role: lambdaRole,
			environment: { STAGE: this.stage },
		});

		const fetchResults = new Function(this, 'FetchResultsLambda', {
			functionName: `supporterProductData-FetchResults-${this.stage}`,
			runtime: Runtime.NODEJS_22_X,
			handler: 'fetchResultsLambda.handler',
			code: lambdaArtifact,
			timeout: Duration.minutes(5),
			memorySize: 512,
			role: lambdaRole,
			environment: { STAGE: this.stage },
		});

		const queue = new Queue(this, 'SupporterProductDataQueue', {
			queueName: `supporter-product-data-lambdas-${this.stage}`,
			visibilityTimeout: Duration.seconds(600),
			deadLetterQueue: {
				queue: new Queue(this, 'SupporterProductDataDeadLetterQueue', {
					queueName: `dead-letters-supporter-product-data-lambdas-${this.stage}`,
				}),
				maxReceiveCount: 10,
			},
		});

		const addToQueue = new Function(
			this,
			'AddSupporterRatePlanItemToQueueLambda',
			{
				functionName: `supporterProductData-AddToQueue-${this.stage}`,
				runtime: Runtime.NODEJS_22_X,
				handler: 'addSupporterRatePlanItemToQueueLambda.handler',
				code: lambdaArtifact,
				timeout: Duration.minutes(10),
				memorySize: 1024,
				role: lambdaRole,
				environment: { STAGE: this.stage },
			},
		);

		const processItem = new Function(
			this,
			'ProcessSupporterRatePlanItemLambda',
			{
				functionName: `supporterProductData-ProcessItem-${this.stage}`,
				runtime: Runtime.NODEJS_22_X,
				handler: 'processSupporterRatePlanItemLambda.handler',
				code: lambdaArtifact,
				timeout: Duration.minutes(10),
				memorySize: 1024,
				role: lambdaRole,
				environment: { STAGE: this.stage },
			},
		);

		queue.grantSendMessages(addToQueue);
		queue.grantConsumeMessages(processItem);
		processItem.addEventSource(
			new SqsEventSource(queue, {
				batchSize: 10,
				maxBatchingWindow: Duration.seconds(5),
				// Limit the number of concurrent Lambda invocations consuming from the
				// queue to avoid hitting the account-level Lambda concurrency limit
				// when there are hundreds of thousands of records to process.
				// At batchSize 10 and maxConcurrency 50 this gives a throughput of
				// 500 items/invocation-cycle whilst leaving headroom for other lambdas.
				maxConcurrency: processItemMaxConcurrency,
			}),
		);

		const addToQueueAgainTask = new LambdaInvoke(this, 'AddToQueueAgainTask', {
			lambdaFunction: addToQueue,
			payloadResponseOnly: true,
		});

		const moreToProcess = new Choice(this, 'MoreToProcess');
		moreToProcess
			.when(
				Condition.numberLessThanJsonPath('$.processedCount', '$.recordCount'),
				addToQueueAgainTask,
			)
			.otherwise(new Succeed(this, 'Done'));

		addToQueueAgainTask.next(moreToProcess);

		const noNewSubscriptions = new Succeed(this, 'NoNewSubscriptions');

		const checkForNewSubscriptions = new Choice(
			this,
			'CheckForNewSubscriptions',
		);
		checkForNewSubscriptions
			.when(Condition.numberEquals('$.recordCount', 0), noNewSubscriptions)
			.otherwise(
				new LambdaInvoke(this, 'AddToQueueTask', {
					lambdaFunction: addToQueue,
					payloadResponseOnly: true,
				}).next(moreToProcess),
			);

		const definition = new LambdaInvoke(this, 'QueryZuoraTask', {
			lambdaFunction: queryZuora,
			payloadResponseOnly: true,
		})
			.next(
				new Wait(this, 'WaitForZuora', {
					time: WaitTime.duration(Duration.seconds(30)),
				}),
			)
			.next(
				new LambdaInvoke(this, 'FetchResultsTask', {
					lambdaFunction: fetchResults,
					payloadResponseOnly: true,
				}).addRetry({
					errors: ['States.ALL'],
					interval: Duration.seconds(60),
					maxAttempts: 20,
					backoffRate: 1,
				}),
			)
			.next(checkForNewSubscriptions);

		const stateMachine = new StateMachine(
			this,
			'SupporterProductDataStateMachine',
			{
				stateMachineName: `supporter-product-data-lambdas-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(definition),
			},
		);

		const scheduleExpression =
			this.stage === 'PROD' ? 'cron(*/5 * ? * * *)' : 'cron(0 9 ? * MON-FRI *)';

		new Rule(this, 'SupporterProductDataSchedule', {
			schedule: Schedule.expression(scheduleExpression),
			targets: [
				new SfnStateMachine(stateMachine, {
					input: RuleTargetInput.fromObject({ queryType: 'incremental' }),
				}),
			],
		});

		// Alarms — PROD only
		const alarmsTopic = Topic.fromTopicArn(
			this,
			'AlarmsHandlerTopic',
			`arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`,
		);
		const addAlarmAction = (alarm: Alarm) => {
			if (this.stage === 'PROD') {
				alarm.addAlarmAction(new SnsAction(alarmsTopic));
			}
		};

		// Step function execution failure — suppresses alarms between 00:00-06:00 UTC
		// when Zuora is slow and failures are expected
		const executionFailuresMetric = new Metric({
			namespace: 'AWS/States',
			metricName: 'ExecutionsFailed',
			dimensionsMap: { StateMachineArn: stateMachine.stateMachineArn },
			statistic: 'Sum',
			period: Duration.seconds(60),
			unit: Unit.COUNT,
		});
		const executionFailureAlarm = new Alarm(this, 'ExecutionFailureAlarm', {
			alarmName: `Supporter Product Data step function Failure in ${this.stage}`,
			alarmDescription: `The supporter-product-data-lambdas-${this.stage} step function has failed. Check the Step Functions console for details.`,
			metric: new MathExpression({
				expression: 'IF(HOUR(errors) > 5, errors)',
				usingMetrics: { errors: executionFailuresMetric },
				period: Duration.seconds(60),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			threshold: 1,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
		addAlarmAction(executionFailureAlarm);

		// DLQ — messages appearing means a record failed processing after all retries
		const dlq = queue.deadLetterQueue!.queue;
		const dlqAlarm = new Alarm(this, 'UnprocessedRecordAlarm', {
			alarmName: `There was a failure processing a supporter record in the ProcessSupporterRatePlanItemLambda lambda in ${this.stage}`,
			alarmDescription:
				`Check the ${dlq.queueName} SQS dead-letter queue for details of the record which failed, ` +
				`and the ProcessSupporterRatePlanItemLambda CloudWatch logs for what went wrong.`,
			metric: new Metric({
				namespace: 'AWS/SQS',
				metricName: 'ApproximateNumberOfMessagesVisible',
				dimensionsMap: { QueueName: dlq.queueName },
				statistic: 'Average',
				period: Duration.seconds(60),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 1,
			evaluationPeriods: 60,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
		addAlarmAction(dlqAlarm);

		// Custom metric alarms from the lambdas themselves
		const customMetricAlarm = (
			id: string,
			alarmName: string,
			alarmDescription: string,
			metricName: string,
			lambdaFunctionName: string,
		) =>
			new SrLambdaAlarm(this, id, {
				app: 'supporter-product-data-lambdas',
				alarmName,
				alarmDescription,
				metric: new Metric({
					namespace: 'supporter-product-data',
					metricName,
					dimensionsMap: { Stage: this.stage },
					statistic: 'Average',
					period: Duration.seconds(60),
				}),
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				threshold: 1,
				evaluationPeriods: 1,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				lambdaFunctionNames: lambdaFunctionName,
			});

		customMetricAlarm(
			'CsvReadAlarm',
			'There was a csv read failure when loading supporter product data into DynamoDB',
			`Search for 'CSV read failure' in the ${addToQueue.functionName} CloudWatch logs.`,
			'CsvReadFailure',
			addToQueue.functionName,
		);

		customMetricAlarm(
			'DynamoWriteAlarm',
			'There was a DynamoDB write failure when writing supporter product data into DynamoDB',
			`Impact: one or more subscribers will not get their digital benefits. ` +
				`Search for 'Error writing item to Dynamo' in the ${processItem.functionName} CloudWatch logs.`,
			'DynamoWriteFailure',
			processItem.functionName,
		);

		customMetricAlarm(
			'SqsWriteAlarm',
			`There was a failure when trying to write supporter data to the supporter-product-data-lambdas-${this.stage} SQS queue`,
			`Search for 'Failed to write SQS batch' in the ${addToQueue.functionName} CloudWatch logs.`,
			'SqsWriteFailure',
			addToQueue.functionName,
		);
	}
}
