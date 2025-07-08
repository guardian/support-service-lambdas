import { GuScheduledLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack, GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { Schedule } from 'aws-cdk-lib/aws-events';
import {
	AnyPrincipal,
	Effect,
	Policy,
	PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	EmailSubscription,
	SqsSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';

export class AlarmsHandler extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'alarms-handler';

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const queue = new Queue(this, `${app}-queue`, {
			queueName: `${app}-queue-${this.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 3,
			},
		});

		const mobileAccountId = new GuStringParameter(
			this,
			`${app}-mobile-aws-account`,
			{
				description: 'ID of the mobile aws account',
			},
		);
		const mobileAccountRoleArn = new GuStringParameter(
			this,
			`${app}-mobile-account-role-arn`,
			{
				description:
					'ARN of role in the mobile account which allows cloudwatch:ListTagsForResource',
			},
		);
		const targetingAccountId = new GuStringParameter(
			this,
			`${app}-targeting-aws-account`,
			{
				description: 'ID of the targeting aws account',
			},
		);
		const targetingAccountRoleArn = new GuStringParameter(
			this,
			`${app}-targeting-account-role-arn`,
			{
				description:
					'ARN of role in the targeting account which allows cloudwatch:ListTagsForResource',
			},
		);

		const backupEmailAddress = new GuStringParameter(
			this,
			`${app}-backup-email-address`,
			{
				description:
					'Alarm email address to use if the alarms handler itself fails',
			},
		);

		const triggeredLambda = new GuLambdaFunction(this, `${app}-lambda`, {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(15),
			handler: 'index.handler',
			functionName: `${app}-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			events: [new SqsEventSource(queue)],
			environment: {
				APP: app,
				STACK: this.stack,
				STAGE: this.stage,
			},
		});

		triggeredLambda.role?.attachInlinePolicy(
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
		triggeredLambda.addToRolePolicy(
			new PolicyStatement({
				actions: ['sts:AssumeRole'],
				effect: Effect.ALLOW,
				resources: [
					mobileAccountRoleArn.valueAsString,
					targetingAccountRoleArn.valueAsString,
				],
			}),
		);

		const snsTopic = new Topic(this, `${app}-topic`, {
			topicName: `${app}-topic-${this.stage}`,
		});

		snsTopic.addSubscription(new SqsSubscription(queue));

		// Allow cross-account publishing to the topic
		snsTopic.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['sns:Publish'],
				// Setting principal to mobileAccountId doesn't work, so we have to restrict the account in the conditions below
				principals: [new AnyPrincipal()],
				resources: [snsTopic.topicArn],
				conditions: {
					ArnLike: {
						'aws:SourceArn': [
							`arn:aws:cloudwatch:eu-west-1:${mobileAccountId.valueAsString}:alarm:*`,
							`arn:aws:cloudwatch:eu-west-1:${targetingAccountId.valueAsString}:alarm:*`,
							`arn:aws:cloudwatch:eu-west-1:${this.account}:alarm:*`,
						],
					},
				},
			}),
		);

		const emailTopic = new Topic(this, `${app}-email-topic`, {
			topicName: `${app}-email-topic-${this.stage}`,
		});

		emailTopic.addSubscription(
			new EmailSubscription(backupEmailAddress.valueAsString),
		);

		new GuAlarm(this, `${app}-alarm`, {
			app: app,
			snsTopicName: emailTopic.topicName, // we don't send to our own topic to avoid a loop
			alarmName: `${this.stage}: Failed to handle CloudWatch alarm`,
			alarmDescription: `There was an error in the lambda function that handles CloudWatch alarms.`,
			metric: deadLetterQueue
				.metric('ApproximateNumberOfMessagesVisible')
				.with({ statistic: 'Sum', period: Duration.minutes(1) }),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 24,
			actionsEnabled: this.stage === 'PROD' || this.stage === 'CODE',
		});

		const scheduledLambda = new GuScheduledLambda(
			this,
			`${app}-scheduled-lambda`,
			{
				app,
				memorySize: 1024,
				fileName: `${app}.zip`,
				runtime: nodeVersion,
				timeout: Duration.seconds(15),
				handler: 'indexScheduled.handler',
				functionName: `${app}-scheduled-${this.stage}`,
				loggingFormat: LoggingFormat.TEXT,
				environment: {
					APP: app,
					STACK: this.stack,
					STAGE: this.stage,
				},
				monitoringConfiguration: {
					actionsEnabled: this.stage === 'PROD',
					toleratedErrorPercentage: 0,
					numberOfEvaluationPeriodsAboveThresholdBeforeAlarm: 1,
					snsTopicName: emailTopic.topicName, // we don't send to our own topic to avoid a loop
				},
				rules: [
					{
						schedule: Schedule.cron({
							weekDay: 'MON-FRI',
							hour: '8',
							minute: '0',
						}),
						description: 'notify about alarms in Alarm state every morning',
					},
				],
			},
		);

		scheduledLambda.role?.attachInlinePolicy(
			new Policy(this, `${app}-scheduled-cloudwatch-policy`, {
				statements: [
					new PolicyStatement({
						actions: ['cloudwatch:ListTagsForResource'],
						resources: ['*'],
					}),
					new PolicyStatement({
						actions: ['cloudwatch:DescribeAlarms'],
						resources: ['*'],
					}),
				],
			}),
		);

		// Allow the lambda to assume the roles that allow cross-account fetching of tags
		scheduledLambda.addToRolePolicy(
			new PolicyStatement({
				actions: ['sts:AssumeRole'],
				effect: Effect.ALLOW,
				resources: [
					mobileAccountRoleArn.valueAsString,
					targetingAccountRoleArn.valueAsString,
				],
			}),
		);
	}
}
