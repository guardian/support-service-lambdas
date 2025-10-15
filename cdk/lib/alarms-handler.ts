import { GuAllowPolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App, CfnResource } from 'aws-cdk-lib';
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

		const backupEmailTopic = new Topic(this, `${app}-email-topic`, {
			topicName: `${app}-email-topic-${this.stage}`,
		});

		backupEmailTopic.addSubscription(
			new EmailSubscription(backupEmailAddress.valueAsString),
		);

		const commonPolicies = [
			alarmTagFetchingPolicy(this),
			crossAccountAlarmTagFetchingPolicy(
				this,
				mobileAccountRoleArn.valueAsString,
				targetingAccountRoleArn.valueAsString,
			),
		];

		const triggeredLambda = new SrSqsLambda(this, {
			errorImpact: 'could not send an alarm notification to a chat channel',
			monitoring: {
				snsTopicName: backupEmailTopic.topicName, // we don't send to our own topic to avoid a loop
			},
		});
		(
			triggeredLambda.inputQueue.node.defaultChild as CfnResource
		).overrideLogicalId('alarmshandlerqueue255509D6');
		(
			triggeredLambda.inputDeadLetterQueue.node.defaultChild as CfnResource
		).overrideLogicalId('deadlettersalarmshandlerqueueC7A67616');

		triggeredLambda.addPolicies(...commonPolicies);

		const triggerSnsTopic = new Topic(this, `${app}-topic`, {
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
			monitoring: {
				snsTopicName: backupEmailTopic.topicName, // we don't send to our own topic to avoid a loop
			},
		});

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
	mobileAccountRoleArn: string,
	targetingAccountRoleArn: string,
) {
	return new GuAllowPolicy(scope, `${scope.app}-assume-role-policy`, {
		actions: ['sts:AssumeRole'],
		resources: [mobileAccountRoleArn, targetingAccountRoleArn],
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
