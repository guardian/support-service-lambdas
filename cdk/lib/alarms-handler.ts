import type { App } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import {
	AnyPrincipal,
	Effect,
	Policy,
	PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	EmailSubscription,
	SqsSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { SrAppConfigKey } from './cdk/SrAppConfigKey';
import { getNameWithStage } from './cdk/SrLambda';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class AlarmsHandler extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'alarms-handler', stage });

		const app = this.app;

		const mobileAccountId = new SrAppConfigKey(this, `accounts/MOBILE/id`);
		const mobileAccountRoleArn = new SrAppConfigKey(
			this,
			`accounts/MOBILE/roleArn`,
			'ARN of role in the mobile account which allows cloudwatch:ListTagsForResource',
		);
		const targetingAccountId = new SrAppConfigKey(
			this,
			'accounts/TARGETING/id',
		);
		const targetingAccountRoleArn = new SrAppConfigKey(
			this,
			`accounts/TARGETING/roleArn`,
			'ARN of role in the targeting account which allows cloudwatch:ListTagsForResource',
		);

		const backupEmailAddress = new SrAppConfigKey(
			this,
			`backupEmail`,
			'Alarm email address to use if the alarms handler itself fails',
		);

		const backupEmailTopic = new Topic(this, 'EmailTopic', {
			topicName: getNameWithStage(this, 'email-topic'),
		});

		backupEmailTopic.addSubscription(
			new EmailSubscription(backupEmailAddress.valueAsString),
		);

		const alarmTagFetchingPolicy = buildAlarmTagFetchingPolicy(
			this,
			mobileAccountRoleArn.valueAsString,
			targetingAccountRoleArn.valueAsString,
		);

		const triggeredLambda = new SrSqsLambda(this, 'TriggeredLambda', {
			monitoring: {
				errorImpact: 'could not send an alarm notification to a chat channel',
				snsTopicName: backupEmailTopic.topicName, // we don't send to our own topic to avoid a loop
			},
			maxReceiveCount: 3,
		});

		triggeredLambda.addPolicies(alarmTagFetchingPolicy);

		const triggerSnsTopic = new Topic(this, 'Topic', {
			topicName: `${app}-topic-${this.stage}`,
		});

		triggerSnsTopic.addSubscription(
			new SqsSubscription(triggeredLambda.inputQueue),
		);

		triggerSnsTopic.addToResourcePolicy(
			snsAllowCrossAccountPublishingPolicy(
				this,
				triggerSnsTopic,
				mobileAccountId.valueAsString,
				targetingAccountId.valueAsString,
			),
		);

		const scheduledLambda = new SrScheduledLambda(this, 'ScheduledLambda', {
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
			monitoring: {
				snsTopicName: backupEmailTopic.topicName, // we don't send to our own topic to avoid a loop
				errorImpact:
					'daily alarm summary will not be sent to the team chat channels',
			},
		});

		scheduledLambda.addPolicies(
			describeAlarmsPolicy(this),
			alarmTagFetchingPolicy,
		);
	}
}

function buildAlarmTagFetchingPolicy(
	scope: SrStack,
	mobileAccountRoleArn: string,
	targetingAccountRoleArn: string,
) {
	return new Policy(scope, 'CloudwatchPolicy', {
		statements: [
			new PolicyStatement({
				actions: ['cloudwatch:ListTagsForResource'],
				resources: ['*'],
			}),
			new PolicyStatement({
				actions: ['sts:AssumeRole'],
				resources: [mobileAccountRoleArn, targetingAccountRoleArn],
			}),
		],
	});
}

function describeAlarmsPolicy(scope: SrStack) {
	return new Policy(scope, `ScheduledCloudwatchPolicy`, {
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
	mobileAccountId: string,
	targetingAccountId: string,
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
					`arn:aws:cloudwatch:eu-west-1:${mobileAccountId}:alarm:*`,
					`arn:aws:cloudwatch:eu-west-1:${targetingAccountId}:alarm:*`,
					`arn:aws:cloudwatch:eu-west-1:${scope.account}:alarm:*`,
				],
			},
		},
	});
}
