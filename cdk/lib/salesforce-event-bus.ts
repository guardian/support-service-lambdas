import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
	EventBus,
	EventField,
	Match,
	Rule,
	RuleTargetInput,
} from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { CfnQueuePolicy, Queue } from 'aws-cdk-lib/aws-sqs';
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

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${props.stage}`,
			retentionPeriod: Duration.days(14),
		});

		new GuAlarm(this, 'DeadLetterQueueAlarm', {
			app: app,
			alarmName: `An event for ${props.stage} ${app} was not processed`,
			alarmDescription:
				`There is one or more event in the ${app} dead letter queue (DLQ). ` +
				'Check that the rule corresponding to the failed message is correctly configured.\n' +
				`DLQ: https://eu-west-1.console.aws.amazon.com/sqs/v2/home?region=eu-west-1#/queues/https%3A%2F%2Fsqs.eu-west-1.amazonaws.com%2F865473395570%2F${deadLetterQueue.queueName}`,
			metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.IGNORE,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
		});

		const sfOutboundMessageQueue = Queue.fromQueueArn(
			this,
			'SalesforceOutboundMessageQueue',
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
			new SqsQueue(sfOutboundMessageQueue, {
				deadLetterQueue: deadLetterQueue,
				maxEventAge: Duration.hours(2),
				retryAttempts: 2,
				message: RuleTargetInput.fromObject({
					//   "InputPathsMap": { "detail-payload-Contact_ID__c": "$.detail.payload.Contact_ID__c" }
					//   "InputTemplate": "{\"contactId\": <detail-payload-Contact_ID__c>}"
					contactId: EventField.fromPath('$.detail.payload.Contact_ID__c'),
				}),
			}),
		);

		new CfnQueuePolicy(this, 'SalesforceOutboundQueuePolicy', {
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Principal: {
							Service: 'events.amazonaws.com',
						},
						Action: 'sqs:SendMessage',
						Resource: sfOutboundMessageQueue.queueArn,
						Condition: {
							ArnEquals: {
								'aws:SourceArn': contactUpdateToSqsRule.ruleArn,
							},
						},
					},
				],
			},
			queues: [sfOutboundMessageQueue.queueUrl], // Must use queueUrl here
		});
	}
}
