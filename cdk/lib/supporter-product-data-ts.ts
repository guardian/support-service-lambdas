import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
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

interface SupporterProductDataTSProps extends GuStackProps {
	processItemMaxConcurrency: number;
}

export class SupporterProductDataTS extends GuStack {
	constructor(scope: App, id: string, props: SupporterProductDataTSProps) {
		super(scope, id, props);

		const { processItemMaxConcurrency } = props;

		const artifactBucket = Bucket.fromBucketName(
			this,
			'SupporterProductDataTsDistBucket',
			'membership-dist',
		);

		const lambdaArtifact = Code.fromBucket(
			artifactBucket,
			`support/${this.stage}/supporter-product-data-ts/supporter-product-data-ts.zip`,
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
			functionName: `support-SupporterProductDataTSQueryZuora-${this.stage}`,
			runtime: Runtime.NODEJS_22_X,
			handler: 'queryZuoraLambda.handler',
			code: lambdaArtifact,
			timeout: Duration.minutes(5),
			memorySize: 512,
			role: lambdaRole,
			environment: { STAGE: this.stage },
		});

		const fetchResults = new Function(this, 'FetchResultsLambda', {
			functionName: `support-SupporterProductDataTSFetchResults-${this.stage}`,
			runtime: Runtime.NODEJS_22_X,
			handler: 'fetchResultsLambda.handler',
			code: lambdaArtifact,
			timeout: Duration.minutes(5),
			memorySize: 512,
			role: lambdaRole,
			environment: { STAGE: this.stage },
		});

		const queue = new Queue(this, 'SupporterProductDataQueue', {
			queueName: `supporter-product-data-ts-${this.stage}`,
			visibilityTimeout: Duration.seconds(600),
		});

		const addToQueue = new Function(
			this,
			'AddSupporterRatePlanItemToQueueLambda',
			{
				functionName: `support-SupporterProductDataTSAddToQueue-${this.stage}`,
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
				functionName: `support-SupporterProductDataTSProcessItem-${this.stage}`,
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
				stateMachineName: `supporter-product-data-ts-${this.stage}`,
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
	}
}
