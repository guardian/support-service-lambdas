import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { EventBus, Match, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrLambdaAlarm } from '../module/cdk/sr-lambda-alarm';

export const APP_NAME = 'single-contribution-salesforce-writes';

export class SingleContributionSalesforceWrites extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const deadLetterQueue = new Queue(this, `dead-letters-${APP_NAME}-queue`, {
			queueName: `dead-letters-${APP_NAME}-queue-${props.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const queue = new Queue(this, `${APP_NAME}-queue`, {
			queueName: `${APP_NAME}-queue-${props.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 3,
			},
		});

		const acquisitionBusName = `acquisitions-bus-${props.stage}`;

		const acquisitionBus = EventBus.fromEventBusArn(
			this,
			'AcquisitionBus',
			`arn:aws:events:${this.region}:${this.account}:event-bus/${acquisitionBusName}`,
		);

		const rule = new Rule(
			this,
			'AcquisitionBusToSingleContributionSalesforceWritesQueueRule',
			{
				description:
					'Send payment api events to the single-contribution-salesforce-writes-queue',
				eventPattern: {
					region: [this.region],
					account: [this.account],
					source: Match.prefix('payment-api'),
				},
				eventBus: acquisitionBus,
				targets: [new SqsQueue(queue)],
			},
		);

		const sendMessagePolicyStatement = new PolicyStatement({
			sid: 'Allow acquisition bus to send messages to the single-contribution-salesforce-writes-queue',
			principals: [new ServicePrincipal('events.amazonaws.com')],
			effect: Effect.ALLOW,
			resources: [queue.queueArn],
			actions: ['sqs:SendMessage'],
			conditions: {
				ArnEquals: {
					'aws:SourceArn': rule.ruleArn,
				},
			},
		});

		queue.addToResourcePolicy(sendMessagePolicyStatement);

		const lambda = new GuLambdaFunction(this, `${APP_NAME}-lambda`, {
			app: APP_NAME,
			runtime: Runtime.JAVA_11,
			fileName: `${APP_NAME}.jar`,
			functionName: `${APP_NAME}-${props.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			handler:
				'com.gu.singleContributionSalesforceWrites.handlers.CreateSalesforceSingleContributionRecordHandler::handleRequest',
			events: [new SqsEventSource(queue)],
		});

		const getSecretValuePolicyStatement = new PolicyStatement({
			effect: Effect.ALLOW,
			resources: [
				`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${props.stage}/Salesforce/User/SingleContributionSalesforceWrites-*`,
				`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${props.stage}/Salesforce/ConnectedApp/SingleContributionSalesforceWrites-*`,
			],
			actions: ['secretsmanager:GetSecretValue'],
		});

		lambda.addToRolePolicy(getSecretValuePolicyStatement);

		new SrLambdaAlarm(this, `${APP_NAME}-alarm`, {
			app: APP_NAME,
			alarmName: `${this.stage}: Failed to sync single contribution to Salesforce`,
			alarmDescription: `Impact: A Single Contribution record has not been added to Salesforce. Fix: check logs for lambda ${lambda.functionName} and redrive from dead letter queue or, if Salesforce is preventing record creation due to a data quality issue, fix and add record manually to Salesforce`,
			metric: deadLetterQueue
				.metric('ApproximateNumberOfMessagesVisible')
				.with({ statistic: 'Sum', period: Duration.hours(1) }),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 24,
			lambdaFunctionNames: lambda.functionName,
		});
	}
}
