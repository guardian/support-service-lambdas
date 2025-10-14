import {
	GuAlarm,
	GuLambdaErrorPercentageAlarm,
} from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuStringParameter } from '@guardian/cdk/lib/constructs/core';
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
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	EmailSubscription,
	SqsSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { getNameWithStage, SrLambda } from './cdk/SrLambda';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';
import { ReadAccountIdsPolicy } from './cdk/policies';
import { GuAllowPolicy } from '@guardian/cdk/lib/constructs/iam';

export class AlarmsHandler extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'alarms-handler', stage });

		const app = this.app;

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
				fromSSM: true,
				default: '/accountIds/mobile',
			},
		);
		const mobileAccountRoleArn = new GuStringParameter(
			this,
			`${app}-mobile-account-role-arn`,
			{
				description:
					'ARN of role in the mobile account which allows cloudwatch:ListTagsForResource',
				fromSSM: true,
				default: `/${this.stage}/${this.stack}/${this.app}/accounts/MOBILE/roleArn`,
			},
		);
		const targetingAccountId = new GuStringParameter(
			this,
			`${app}-targeting-aws-account`,
			{
				description: 'ID of the targeting aws account',
				fromSSM: true,
				default: '/accountIds/targeting',
			},
		);
		const targetingAccountRoleArn = new GuStringParameter(
			this,
			`${app}-targeting-account-role-arn`,
			{
				description:
					'ARN of role in the targeting account which allows cloudwatch:ListTagsForResource',
				fromSSM: true,
				default: `/${this.stage}/${this.stack}/${this.app}/accounts/TARGETING/roleArn`,
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

		const triggeredLambda = new SrLambda(this, {
			lambdaOverrides: {
				events: [new SqsEventSource(queue)],
			},
		});

		const commonPolicies = [
			new ReadAccountIdsPolicy(this),
			alarmTagFetchingPolicy(this),
			crossAccountAlarmTagFetchingPolicy(
				this,
				mobileAccountRoleArn,
				targetingAccountRoleArn,
			),
		];
		triggeredLambda.addPolicies(...commonPolicies);

		const snsTopic = new Topic(this, `${app}-topic`, {
			topicName: `${app}-topic-${this.stage}`,
		});

		snsTopic.addSubscription(new SqsSubscription(queue));

		snsTopic.addToResourcePolicy(
			snsAllowCrossAccountPublishingPolicy(
				this,
				snsTopic,
				mobileAccountId,
				targetingAccountId,
			),
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
			actionsEnabled: this.stage === 'PROD',
		});

		const scheduledLambda = new SrScheduledLambda(this, {
			nameSuffix: 'scheduled',
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
			lambdaOverrides: {
				handler: 'indexScheduled.handler',
			},
		});
		new GuLambdaErrorPercentageAlarm(
			this,
			`${getNameWithStage(this, 'scheduled')}-ErrorPercentageAlarmForLambda`,
			{
				actionsEnabled: this.stage === 'PROD',
				toleratedErrorPercentage: 0,
				numberOfEvaluationPeriodsAboveThresholdBeforeAlarm: 1,
				snsTopicName: emailTopic.topicName, // we don't send to our own topic to avoid a loop
				lambda: scheduledLambda,
			},
		);

		scheduledLambda.addPolicies(describeAlarmsPolicy(this), ...commonPolicies);
	}
}

function alarmTagFetchingPolicy(scope: SrStack) {
	return new Policy(scope, `${scope.app}-cloudwatch-policy`, {
		statements: [
			new PolicyStatement({
				actions: ['cloudwatch:ListTagsForResource'],
				resources: ['*'],
			}),
		],
	});
}

function crossAccountAlarmTagFetchingPolicy(
	scope: SrStack,
	mobileAccountRoleArn: GuStringParameter,
	targetingAccountRoleArn: GuStringParameter,
) {
	return new GuAllowPolicy(scope, `${scope.app}-assume-role-policy`, {
		actions: ['sts:AssumeRole'],
		resources: [
			mobileAccountRoleArn.valueAsString,
			targetingAccountRoleArn.valueAsString,
		],
	});
}

function describeAlarmsPolicy(scope: SrStack) {
	return new Policy(scope, `${scope.app}-scheduled-cloudwatch-policy`, {
		statements: [
			new PolicyStatement({
				actions: ['cloudwatch:DescribeAlarms'],
				resources: ['*'],
			}),
		],
	});
}

function snsAllowCrossAccountPublishingPolicy(
	scope: SrStack,
	snsTopic: Topic,
	mobileAccountId: GuStringParameter,
	targetingAccountId: GuStringParameter,
) {
	return new PolicyStatement({
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
					`arn:aws:cloudwatch:eu-west-1:${scope.account}:alarm:*`,
				],
			},
		},
	});
}
