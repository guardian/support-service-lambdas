import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { EventBus, Match, Rule } from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';

export class SalesforceEventBus extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-event-bus';

		new GuLambdaFunction(this, 'SalesforceEventBusPlaceholder', {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(300),
			handler: 'salesforceEventBusPlaceholder.handler',
			functionName: `${app}-placeholder-${this.stage}`,
		});

		const salesforceBus = EventBus.fromEventBusArn(
			this,
			'SalesforceBus',
			this.stage === 'PROD'
				? `arn:aws:events:${this.region}::event-source/aws.partner/salesforce.com/00D20000000nq5gEAA/0YLQv00000000zJOAQ`
				: `arn:aws:events:${this.region}::event-source/aws.partner/salesforce.com/00D9E0000004jvhUAA/0YLUD00000008Ll4AI`,
		);

		const logGroup = new LogGroup(this, 'SfEventBusLogGroup', {
			logGroupName: `/aws/events/sf-event-bus-${props.stage}`,
			retention: RetentionDays.TWO_WEEKS,
		});

		new Rule(this, 'EventToCloudWatch', {
			description:
				'Send an event received by the SF bus to a Cloudwatch log group',
			eventPattern: {
				source: Match.prefix('aws.partner/salesforce.com'),
			},
			eventBus: salesforceBus,
			targets: [new targets.CloudWatchLogGroup(logGroup)],
		});

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${props.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const sfOutboundMessageQueue = Queue.fromQueueArn(
			this,
			'ExistingOutboundMessageQueue',
			`arn:aws:sqs:eu-west-1:865473395570:salesforce-outbound-messages-${props.stage}`,
		);

		const contactUpdateToSqsRule = new Rule(this, 'SfBusToContactUpdateQueue', {
			description:
				'Send an SF Contact Update event from the SF bus to the salesforce-outbound-messages-[STAGE] SQS queue for consumption by membership-workflow',
			eventPattern: {
				source: Match.prefix('aws.partner/salesforce.com'),
				detailType: ['Contact_Update__e'],
			},
			eventBus: salesforceBus,
		});

		contactUpdateToSqsRule.addTarget(
			new targets.SqsQueue(sfOutboundMessageQueue, {
				deadLetterQueue: deadLetterQueue,
				maxEventAge: Duration.hours(2),
				retryAttempts: 2,
			}),
		);

		const sendMessagePolicyStatement = new PolicyStatement({
			sid: `Allow Salesforce Event Bus to send messages to the salesforce-outbound-messages queue`,
			principals: [new ServicePrincipal('events.amazonaws.com')],
			effect: Effect.ALLOW,
			resources: [sfOutboundMessageQueue.queueArn],
			actions: ['sqs:SendMessage'],
			conditions: {
				ArnEquals: {
					'aws:SourceArn': contactUpdateToSqsRule.ruleArn,
				},
			},
		});

		sfOutboundMessageQueue.addToResourcePolicy(sendMessagePolicyStatement);
	}
}
