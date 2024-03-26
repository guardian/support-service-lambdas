import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack, GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';

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

		const parameters = {
			webhook: new GuStringParameter(this, `${app}-webhook`, {
				description: 'Google Chat webhook URL',
			}),
		};

		new GuLambdaFunction(this, `${app}-lambda`, {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(15),
			handler: 'index.handler',
			functionName: `${app}-${this.stage}`,
			events: [new SqsEventSource(queue)],
			environment: {
				APP: app,
				STACK: this.stack,
				STAGE: this.stage,
				WEBHOOK: parameters.webhook.valueAsString,
			},
		});

		const snsTopic = new Topic(this, `${app}-topic`, {
			topicName: `${app}-topic-${this.stage}`,
		});

		snsTopic.addSubscription(new SqsSubscription(queue));

		new GuAlarm(this, `${app}-alarm`, {
			app: app,
			snsTopicName: snsTopic.topicName,
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
	}
}
