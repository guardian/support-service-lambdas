import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { Lazy } from '@modules/lazy';
import dayjs from 'dayjs';
import { prodAlarmMappings } from '../src/alarmMappings';
import type { Tags } from '../src/cloudwatch';
import { getChatMessages } from '../src/indexScheduled';

it('should convert some alarms into a chat message', async () => {
	process.env['VALUE_WEBHOOK'] = 'http://thegulocal.com/VALUE_WEBHOOK';
	process.env['GROWTH_WEBHOOK'] = 'http://thegulocal.com/GROWTH_WEBHOOK';
	const alarms = await getChatMessages(
		dayjs(new Date(2025, 4, 21, 16, 16)),
		'PROD',
		testData,
		prodAlarmMappings,
	);
	console.log('alarmsalarms', alarms);
	expect(alarms).toEqual(expected);
});

const expected = [
	{
		webhookUrl: 'http://thegulocal.com/VALUE_WEBHOOK',
		text: 'These alarms have been going off for more than 24h\n\n- <https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/New message in the product-switch-refund-dead-letter-PROD dead letter queue.|New message in the product-switch-refund-dead-letter-PROD dead letter queue.> - 2025-05-15T15:31:44.985Z - There is a new message in the product-switch-refund-dead-letter-PROD dead letter queue. This means that a user who has cancelled their supporter plus subscription within 14 days has not received the refund that they are due. Please check the product-switch-refund-PROD logs - https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fproduct-switch-refund-PROD and the invoicing-api-refund-PROD logs - https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Finvoicing-api-refund-PROD to diagnose the issue.\n- <https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.|soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.> - 2025-05-09T20:02:56.905Z - Alarm when the dead letter queue accumulates messages.',
	},
	{
		webhookUrl: 'http://thegulocal.com/GROWTH_WEBHOOK',
		text: 'These alarms have been going off for more than 24h\n\n- <https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/support-reminders-PROD: failed event on the dead letter queue|support-reminders-PROD: failed event on the dead letter queue> - 2024-12-19T08:35:01.262Z - A reminder signup event failed and is now on the dead letter queue.',
	},
];

const testData: Array<{ alarm: MetricAlarm; tags: Lazy<Tags> }> = [
	{
		alarm: {
			AlarmName:
				'New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
			AlarmArn:
				'arn:aws:cloudwatch:eu-west-1:12345:alarm:New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
			AlarmDescription:
				'There is a new message in the product-switch-refund-dead-letter-PROD dead letter queue. This means that a user who has cancelled their supporter plus subscription within 14 days has not received the refund that they are due. Please check the product-switch-refund-PROD logs - https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fproduct-switch-refund-PROD and the invoicing-api-refund-PROD logs - https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Finvoicing-api-refund-PROD to diagnose the issue.',
			AlarmConfigurationUpdatedTimestamp: new Date('2024-10-10T10:17:20.516Z'),
			ActionsEnabled: true,
			OKActions: [],
			AlarmActions: ['arn:aws:sns:eu-west-1:12345:alarms-handler-topic-PROD'],
			InsufficientDataActions: [],
			StateValue: 'ALARM',
			StateReason:
				'Threshold Crossed: 1 datapoint [1.0 (15/05/25 15:29:00)] was greater than the threshold (0.0).',
			StateReasonData:
				'{"version":"1.0","queryDate":"2025-05-15T15:31:44.984+0000","startDate":"2025-05-15T15:29:00.000+0000","statistic":"Sum","period":60,"recentDatapoints":[1.0],"threshold":0.0,"evaluatedDatapoints":[{"timestamp":"2025-05-15T15:29:00.000+0000","sampleCount":1.0,"value":1.0}]}',
			StateUpdatedTimestamp: new Date('2025-05-15T15:31:44.985Z'),
			MetricName: 'ApproximateNumberOfMessagesVisible',
			Namespace: 'AWS/SQS',
			Statistic: 'Sum',
			Dimensions: [
				{ Name: 'QueueName', Value: 'product-switch-refund-dead-letter-PROD' },
			],
			Period: 60,
			EvaluationPeriods: 1,
			Threshold: 0,
			ComparisonOperator: 'GreaterThanThreshold',
			TreatMissingData: 'notBreaching',
			StateTransitionedTimestamp: new Date('2025-05-15T15:31:44.985Z'),
		},
		tags: new Lazy(
			() =>
				Promise.resolve({
					App: 'product-move-api',
					// 'aws:cloudformation:stack-name': 'membership-PROD-product-move-api',
					// 'gu:repo': 'guardian/support-service-lambdas',
					// 'aws:cloudformation:stack-id':
					// 	'arn:aws:cloudformation:eu-west-1:12345:stack/membership-PROD-product-move-api/df79fb50-dc3a-11ec-9e94-0236dc1500d9',
					// Stage: 'PROD',
					// 'aws:cloudformation:logical-id': 'RefundLambdaDeadLetterQueueAlarm',
					// 'gu:riff-raff:project': 'support-service-lambdas::product-move-api',
					// 'gu:build-tool': 'unknown',
					// Stack: 'membership',
				}),
			'',
		),
	},
	{
		alarm: {
			AlarmName:
				'soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
			AlarmArn:
				'arn:aws:cloudwatch:eu-west-1:12345:alarm:soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
			AlarmDescription:
				'Alarm when the dead letter queue accumulates messages.',
			AlarmConfigurationUpdatedTimestamp: new Date('2025-04-03T16:39:55.859Z'),
			ActionsEnabled: true,
			OKActions: [],
			AlarmActions: ['arn:aws:sns:eu-west-1:12345:alarms-handler-topic-PROD'],
			InsufficientDataActions: [],
			StateValue: 'ALARM',
			StateReason:
				'Threshold Crossed: 1 datapoint [5.0 (09/05/25 19:56:00)] was greater than or equal to the threshold (5.0).',
			StateReasonData:
				'{"version":"1.0","queryDate":"2025-05-09T20:02:56.904+0000","startDate":"2025-05-09T19:56:00.000+0000","statistic":"Sum","period":300,"recentDatapoints":[5.0],"threshold":5.0,"evaluatedDatapoints":[{"timestamp":"2025-05-09T19:56:00.000+0000","sampleCount":5.0,"value":5.0}]}',
			StateUpdatedTimestamp: new Date('2025-05-09T20:02:56.905Z'),
			MetricName: 'ApproximateNumberOfMessagesVisible',
			Namespace: 'AWS/SQS',
			Statistic: 'Sum',
			Dimensions: [
				{
					Name: 'QueueName',
					Value: 'soft-opt-in-consent-setter-dead-letter-queue-PROD',
				},
			],
			Period: 300,
			EvaluationPeriods: 1,
			Threshold: 5,
			ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			TreatMissingData: 'notBreaching',
			StateTransitionedTimestamp: new Date('2025-05-09T20:02:56.905Z'),
		},
		tags: new Lazy(
			() =>
				Promise.resolve({
					App: 'soft-opt-in-consent-setter',
					// 'aws:cloudformation:stack-name':
					// 	'membership-PROD-soft-opt-in-consent-setter',
					// 'gu:repo': 'guardian/support-service-lambdas',
					// 'aws:cloudformation:stack-id':
					// 	'arn:aws:cloudformation:eu-west-1:12345:stack/membership-PROD-soft-opt-in-consent-setter/798da790-ae52-11eb-a8b8-06f000020239',
					// Stage: 'PROD',
					// 'aws:cloudformation:logical-id': 'deadLetterBuildUpAlarmIAP',
					// 'gu:riff-raff:project':
					// 	'support-service-lambdas::soft-opt-in-consent-setter',
					// 'gu:build-tool': 'guardian/actions-riff-raff',
					// Stack: 'membership',
				}),
			'',
		),
	},
	{
		alarm: {
			AlarmName:
				'support-reminders-PROD: failed event on the dead letter queue',
			AlarmArn:
				'arn:aws:cloudwatch:eu-west-1:12345:alarm:support-reminders-PROD: failed event on the dead letter queue',
			AlarmDescription:
				'A reminder signup event failed and is now on the dead letter queue.',
			AlarmConfigurationUpdatedTimestamp: new Date('2024-12-17T14:25:12.766Z'),
			ActionsEnabled: true,
			OKActions: [],
			AlarmActions: ['arn:aws:sns:eu-west-1:12345:alarms-handler-topic-PROD'],
			InsufficientDataActions: [],
			StateValue: 'ALARM',
			StateReason:
				'Threshold Crossed: 24 datapoints were greater than the threshold (0.0). The most recent datapoints which crossed the threshold: [1.0 (19/12/24 08:33:00), 1.0 (19/12/24 08:32:00), 1.0 (19/12/24 08:31:00), 1.0 (19/12/24 08:30:00), 1.0 (19/12/24 08:29:00)].',
			StateReasonData:
				'{"version":"1.0","queryDate":"2024-12-19T08:35:01.260+0000","startDate":"2024-12-19T08:10:00.000+0000","statistic":"Sum","period":60,"recentDatapoints":[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],"threshold":0.0,"evaluatedDatapoints":[{"timestamp":"2024-12-19T08:33:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:32:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:31:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:30:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:29:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:28:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:27:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:26:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:25:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:24:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:23:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:22:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:21:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:20:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:19:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:18:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:17:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:16:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:15:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:14:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:13:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:12:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:11:00.000+0000","sampleCount":1.0,"value":1.0},{"timestamp":"2024-12-19T08:10:00.000+0000","sampleCount":1.0,"value":1.0}]}',
			StateUpdatedTimestamp: new Date('2024-12-19T08:35:01.262Z'),
			MetricName: 'ApproximateNumberOfMessagesVisible',
			Namespace: 'AWS/SQS',
			Statistic: 'Sum',
			Dimensions: [
				{ Name: 'QueueName', Value: 'dead-letters-support-reminders-PROD' },
			],
			Period: 60,
			EvaluationPeriods: 24,
			Threshold: 0,
			ComparisonOperator: 'GreaterThanThreshold',
			StateTransitionedTimestamp: new Date('2024-12-19T08:35:01.262Z'),
		},
		tags: new Lazy(
			() =>
				Promise.resolve({
					App: 'support-reminders',
					// 'aws:cloudformation:stack-name': 'support-reminders-PROD',
					// 'gu:repo': 'guardian/support-reminders',
					// 'aws:cloudformation:stack-id':
					// 	'arn:aws:cloudformation:eu-west-1:12345:stack/support-reminders-PROD/0f635f10-6c56-11eb-8334-0a4b355a4d25',
					// Stage: 'PROD',
					// 'aws:cloudformation:logical-id': 'supportremindersalarm1BE4F065',
					// 'gu:build-tool': 'guardian/actions-riff-raff',
					// 'gu:cdk:version': '59.3.5',
					// Stack: 'support',
				}),
			'',
		),
	},
];
