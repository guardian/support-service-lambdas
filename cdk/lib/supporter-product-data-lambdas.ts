import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	MathExpression,
	Metric,
	TreatMissingData,
	Unit,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
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
import {
	AllowS3CatalogReadPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const app = 'supporter-product-data-lambdas';

export class SupporterProductDataLambdas extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app });

		// Reference the existing SQS queue by ARN rather than creating a new one.
		// The queue was originally created by the Scala implementation of this stack.
		// To safely migrate:
		//   1. Set RemovalPolicy.RETAIN on the queue in the Scala stack and deploy that change.
		//   2. Delete the Scala stack — the queue is retained (not deleted).
		//   3. This stack already references the queue by ARN so nothing changes at that point.
		// Optionally, use CloudFormation resource import afterwards to bring the queue
		// under full management of this stack.
		const queueName = `supporter-product-data-${this.stage}`;
		const dlqName = `dead-letters-supporter-product-data-${this.stage}`;
		const queue = Queue.fromQueueAttributes(this, 'SupporterProductDataQueue', {
			queueArn: `arn:aws:sqs:${this.region}:${this.account}:${queueName}`,
			queueName,
		});
		const dlq = Queue.fromQueueAttributes(
			this,
			'SupporterProductDataDeadLetterQueue',
			{
				queueArn: `arn:aws:sqs:${this.region}:${this.account}:${dlqName}`,
				queueName: dlqName,
			},
		);
		const processItemMaxConcurrency = stage === 'PROD' ? 30 : 20;

		// Non-standard SSM path used by ConfigService — not covered by the GuCDK auto-policy (which uses /${stage}/${stack}/${app})
		const ssmConfigPolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: [
				'ssm:GetParametersByPath',
				'ssm:GetParameter',
				'ssm:PutParameter',
			],
			resources: [
				`arn:aws:ssm:${this.region}:${this.account}:parameter/supporter-product-data/${this.stage}/*`,
			],
		});
		// Read/write the supporter-product-data-export S3 bucket (used by fetchResults and addToQueue)
		const s3DataExportBucketPolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['s3:PutObject', 's3:GetObject'],
			resources: [
				`arn:aws:s3:::supporter-product-data-export-${this.stage.toLowerCase()}/*`,
			],
		});

		const dynamoWritePolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['dynamodb:UpdateItem', 'dynamodb:PutItem', 'dynamodb:GetItem'],
			resources: [
				`arn:aws:dynamodb:${this.region}:${this.account}:table/SupporterProductData-${this.stage}`,
			],
		});

		const zuoraOAuthPolicy = new AllowZuoraOAuthSecretsPolicy(this);
		const zuoraCatalogS3Policy = new AllowS3CatalogReadPolicy(this);

		// Lambdas
		const queryZuora = new SrLambda(this, 'QueryZuoraLambda', {
			lambdaOverrides: {
				functionName: `supporterProductData-QueryZuora-${this.stage}`,
				handler: 'queryZuoraLambda.handler',
				timeout: Duration.minutes(5),
				environment: { STAGE: this.stage },
				description:
					'A lambda that queries Zuora for new or updated subscriptions since the last successful run, and writes the results to S3',
			},
		});
		queryZuora.addToRolePolicy(ssmConfigPolicy);
		queryZuora.addPolicies(zuoraCatalogS3Policy);
		queryZuora.addPolicies(zuoraOAuthPolicy);

		const fetchResults = new SrLambda(this, 'FetchResultsLambda', {
			lambdaOverrides: {
				functionName: `supporterProductData-FetchResults-${this.stage}`,
				handler: 'fetchResultsLambda.handler',
				timeout: Duration.minutes(5),
				environment: { STAGE: this.stage },
			},
		});
		fetchResults.addToRolePolicy(ssmConfigPolicy);
		fetchResults.addToRolePolicy(s3DataExportBucketPolicy);
		fetchResults.addPolicies(zuoraOAuthPolicy);

		const addToQueue = new SrLambda(
			this,
			'AddSupporterRatePlanItemToQueueLambda',
			{
				lambdaOverrides: {
					functionName: `supporterProductData-AddToQueue-${this.stage}`,
					handler: 'addSupporterRatePlanItemToQueueLambda.handler',
					timeout: Duration.minutes(10),
					environment: { STAGE: this.stage },
				},
			},
		);
		addToQueue.addToRolePolicy(ssmConfigPolicy);
		addToQueue.addToRolePolicy(s3DataExportBucketPolicy);

		const processItem = new SrLambda(
			this,
			'ProcessSupporterRatePlanItemLambda',
			{
				lambdaOverrides: {
					functionName: `supporterProductData-ProcessItem-${this.stage}`,
					handler: 'processSupporterRatePlanItemLambda.handler',
					timeout: Duration.minutes(15),
					environment: { STAGE: this.stage },
				},
			},
		);
		processItem.addPolicies(zuoraCatalogS3Policy);
		processItem.addToRolePolicy(dynamoWritePolicy);
		processItem.addPolicies(zuoraOAuthPolicy);

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
					interval: Duration.minutes(1),
					maxAttempts: 20,
					backoffRate: 1,
				}),
			)
			.next(checkForNewSubscriptions);

		const stateMachine = new StateMachine(
			this,
			'SupporterProductDataStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(definition),
			},
		);

		const every5Minutes = 'cron(*/5 * ? * * *)';
		const weekdays9am = 'cron(0 9 ? * MON-FRI *)';
		const scheduleExpression =
			this.stage === 'PROD' ? every5Minutes : weekdays9am;

		new Rule(this, 'SupporterProductDataSchedule', {
			schedule: Schedule.expression(scheduleExpression),
			targets: [
				new SfnStateMachine(stateMachine, {
					input: RuleTargetInput.fromObject({ queryType: 'incremental' }),
				}),
			],
		});

		// Step function execution failure alarm
		const executionFailuresMetric = new Metric({
			namespace: 'AWS/States',
			metricName: 'ExecutionsFailed',
			dimensionsMap: { StateMachineArn: stateMachine.stateMachineArn },
			statistic: 'Sum',
			period: Duration.minutes(1),
			unit: Unit.COUNT,
		});

		new GuAlarm(this, 'ExecutionFailureAlarm', {
			alarmName: `Supporter Product Data step function Failure in ${this.stage}`,
			alarmDescription: `The ${app}-${this.stage} step function has failed. Check the Step Functions console for details.`,
			// Suppress alarms between 00:00-06:00 UTC when Zuora is slow and failures are expected
			metric: new MathExpression({
				expression: 'IF(HOUR(errors) > 5, errors)',
				usingMetrics: { errors: executionFailuresMetric },
				period: Duration.minutes(1),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			snsTopicName: `alarms-handler-topic-${stage}`,
			actionsEnabled: stage == 'PROD',
			app,
		});

		// DLQ — messages appearing means a record failed processing after all retries
		new GuAlarm(this, 'UnprocessedRecordAlarm', {
			alarmName: `There was a failure processing a supporter record in the ProcessSupporterRatePlanItemLambda lambda in ${this.stage}`,
			alarmDescription:
				`Check the ${dlq.queueName} SQS dead-letter queue for details of the record which failed, ` +
				`and the ProcessSupporterRatePlanItemLambda CloudWatch logs for what went wrong.`,
			metric: dlq.metric('ApproximateNumberOfMessagesVisible').with({
				statistic: 'Average',
				period: Duration.minutes(1),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			snsTopicName: `alarms-handler-topic-${stage}`,
			actionsEnabled: stage == 'PROD',
			app,
		});

		new SrLambdaErrorAlarm(this, 'ProcessItemLambdaErrorsAlarm', {
			lambdaFunctionName: processItem.functionName,
			errorImpact: 'Supporter product data may not be up to date in DynamoDB',
		});
	}
}
