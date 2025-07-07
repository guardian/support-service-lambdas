import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
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

export class SalesforceEventBus extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-event-bus';

		const busId = `arn:aws:events:${this.region}::event-source/aws.partner/salesforce.com/${this.stage === 'PROD' ? '00D20000000nq5gEAA/0YLQv00000000zJOAQ' : '00D9E0000004jvhUAA/0YLUD00000008Ll4AI'}`;

		const salesforceBus = EventBus.fromEventBusArn(
			this,
			'SalesforceBus',
			busId,
		);

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `${app}-dead-letters-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		new GuAlarm(this, 'DeadLetterQueueAlarm', {
			app: app,
			alarmName: `An event for ${this.stage} ${app} was not processed`,
			alarmDescription:
				`There is one or more event in the ${app} dead letter queue (DLQ). ` +
				`Check the attributes of the failed message(s) for details of the error and ` +
				'check that the rule corresponding to the failed message is correctly configured.\n' +
				`DLQ: https://${this.region}.console.aws.amazon.com/sqs/v2/home?region=${this.region}#/queues/https%3A%2F%2Fsqs.${this.region}.amazonaws.com%2F${this.account}%2F${deadLetterQueue.queueName}`,
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
			`arn:aws:sqs:${this.region}:${this.account}:salesforce-outbound-messages-${this.stage}`,
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
				message: RuleTargetInput.fromObject({
					contactId: EventField.fromPath('$.detail.payload.Contact_ID__c'),
					/*   The Input Transformer in the CloudFormation template becomes:
					 *       InputTransformer:
					 *			InputPathsMap:
					 *				detail-payload-Contact_ID__c: $.detail.payload.Contact_ID__c
					 *			InputTemplate: '{"contactId":<detail-payload-Contact_ID__c>}'
					 */
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
			queues: [sfOutboundMessageQueue.queueUrl],
		});
	}
}
