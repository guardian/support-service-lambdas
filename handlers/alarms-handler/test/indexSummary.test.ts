import type { AlarmHistoryItem } from '@aws-sdk/client-cloudwatch';
import { Lazy } from '@modules/lazy';
import type { AppToTeams } from '../src/alarmMappings';
import type {
	AlarmData,
	AlarmHistoryWithTags,
} from '../src/cloudwatch/getAlarmHistory';
import type { Tags } from '../src/cloudwatch/getTags';
import type { WebhookUrls } from '../src/configSchema';
import { getChatMessages } from '../src/indexSummary';

const testAppToTeams: AppToTeams = (app) => {
	const mapping: Record<string, Array<'VALUE' | 'GROWTH'>> = {
		'product-move-api': ['VALUE'],
		'soft-opt-in-consent-setter': ['VALUE'],
		'support-reminders': ['GROWTH'],
	};
	return mapping[app ?? ''] ?? [];
};

it('should convert alarm history into summary chat messages', async () => {
	const webhookUrls: WebhookUrls = {
		VALUE: 'http://thegulocal.com/VALUE_WEBHOOK',
		GROWTH: 'http://thegulocal.com/GROWTH_WEBHOOK',
		SRE: '',
		PORTFOLIO: '',
		PLATFORM: '',
		ENGINE: '',
		PUZZLES: '',
	};

	const chatMessages = await getChatMessages(
		'PROD',
		testData,
		testAppToTeams,
		webhookUrls,
	);

	console.log('chatMessages', JSON.stringify(chatMessages, null, 2));
	expect(chatMessages).toEqual(expected);
});

const expected = [
	{
		team: 'VALUE',
		webhookUrl: 'http://thegulocal.com/VALUE_WEBHOOK',
		payload: {
			cardsV2: [
				{
					cardId: 'alarm-summary',
					card: {
						header: { title: 'Alarm Summary for Past 7 Days' },
						sections: [
							{
								widgets: [
									{
										textParagraph: {
											text: '<b>Total ALARM notifications: 5</b>',
										},
									},
								],
							},
							{
								header: 'Breakdown by alarm',
								widgets: [
									{
										columns: {
											columnItems: [
												{
													horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
													widgets: [
														{ textParagraph: { text: '<b>Alarm Name</b>' } },
													],
												},
												{
													horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
													widgets: [
														{ textParagraph: { text: '<b>Count</b>' } },
													],
												},
											],
										},
									},
									{
										columns: {
											columnItems: [
												{
													horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
													widgets: [
														{
															textParagraph: {
																text: '<a href="https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/soft-opt-in-consent-setter-IAP-PROD%20failed%20and%20sent%20a%20message%20to%20the%20dead%20letter%20queue%2E">soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.</a>',
															},
														},
													],
												},
												{
													horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
													widgets: [{ textParagraph: { text: '3' } }],
												},
											],
										},
									},
									{
										columns: {
											columnItems: [
												{
													horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
													widgets: [
														{
															textParagraph: {
																text: '<a href="https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/New%20message%20in%20the%20product-switch-refund-dead-letter-PROD%20dead%20letter%20queue%2E">New message in the product-switch-refund-dead-letter-PROD dead letter queue.</a>',
															},
														},
													],
												},
												{
													horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
													widgets: [{ textParagraph: { text: '2' } }],
												},
											],
										},
									},
								],
							},
						],
					},
				},
			],
		},
	},
	{
		team: 'GROWTH',
		webhookUrl: 'http://thegulocal.com/GROWTH_WEBHOOK',
		payload: {
			cardsV2: [
				{
					cardId: 'alarm-summary',
					card: {
						header: { title: 'Alarm Summary for Past 7 Days' },
						sections: [
							{
								widgets: [
									{
										textParagraph: {
											text: '<b>Total ALARM notifications: 1</b>',
										},
									},
								],
							},
							{
								header: 'Breakdown by alarm',
								widgets: [
									{
										columns: {
											columnItems: [
												{
													horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
													widgets: [
														{ textParagraph: { text: '<b>Alarm Name</b>' } },
													],
												},
												{
													horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
													widgets: [
														{ textParagraph: { text: '<b>Count</b>' } },
													],
												},
											],
										},
									},
									{
										columns: {
											columnItems: [
												{
													horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
													widgets: [
														{
															textParagraph: {
																text: '<a href="https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/support-reminders-PROD%3A%20failed%20event%20on%20the%20dead%20letter%20queue">support-reminders-PROD: failed event on the dead letter queue</a>',
															},
														},
													],
												},
												{
													horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
													widgets: [{ textParagraph: { text: '1' } }],
												},
											],
										},
									},
								],
							},
						],
					},
				},
			],
		},
	},
];

function buildAlarmHistoryItem(
	alarmName: string,
	timestamp: Date,
	toAlarm: boolean,
): AlarmHistoryItem {
	const newState = toAlarm ? 'ALARM' : 'OK';
	const oldState = toAlarm ? 'OK' : 'ALARM';
	return {
		AlarmName: alarmName,
		Timestamp: timestamp,
		HistoryItemType: 'StateUpdate',
		HistoryData: JSON.stringify({
			oldState: { stateValue: oldState },
			newState: { stateValue: newState },
		}),
	};
}

const testData: AlarmHistoryWithTags[] = [
	{
		alarm: {
			name: 'New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
			arn: 'arn:aws:cloudwatch:eu-west-1:12345:alarm:New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
			actionsEnabled: true,
			actions: ['arn:aws:sns:eu-west-1:12345:alarms-handler-topic-PROD'],
		} satisfies AlarmData,
		history: [
			buildAlarmHistoryItem(
				'New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
				new Date('2025-05-15T15:31:44.985Z'),
				true,
			),
			buildAlarmHistoryItem(
				'New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
				new Date('2025-05-16T10:00:00.000Z'),
				false,
			),
			buildAlarmHistoryItem(
				'New message in the product-switch-refund-dead-letter-PROD dead letter queue.',
				new Date('2025-05-17T08:00:00.000Z'),
				true,
			),
		],
		tags: new Lazy(
			() =>
				Promise.resolve({
					App: 'product-move-api',
				} as Tags),
			'',
		),
	} satisfies AlarmHistoryWithTags,
	{
		alarm: {
			name: 'soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
			arn: 'arn:aws:cloudwatch:eu-west-1:12345:alarm:soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
			actionsEnabled: true,
			actions: ['arn:aws:sns:eu-west-1:12345:alarms-handler-topic-PROD'],
		} satisfies AlarmData,
		history: [
			buildAlarmHistoryItem(
				'soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
				new Date('2025-05-09T20:02:56.905Z'),
				true,
			),
			buildAlarmHistoryItem(
				'soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
				new Date('2025-05-10T08:00:00.000Z'),
				true,
			),
			buildAlarmHistoryItem(
				'soft-opt-in-consent-setter-IAP-PROD failed and sent a message to the dead letter queue.',
				new Date('2025-05-11T12:00:00.000Z'),
				true,
			),
		],
		tags: new Lazy(
			() =>
				Promise.resolve({
					App: 'soft-opt-in-consent-setter',
				} as Tags),
			'',
		),
	} satisfies AlarmHistoryWithTags,
	{
		alarm: {
			name: 'support-reminders-PROD: failed event on the dead letter queue',
			arn: 'arn:aws:cloudwatch:eu-west-1:12345:alarm:support-reminders-PROD: failed event on the dead letter queue',
			actionsEnabled: true,
			actions: ['arn:aws:sns:eu-west-1:12345:alarms-handler-topic-PROD'],
		} satisfies AlarmData,
		history: [
			buildAlarmHistoryItem(
				'support-reminders-PROD: failed event on the dead letter queue',
				new Date('2024-12-19T08:35:01.262Z'),
				true,
			),
		],
		tags: new Lazy(
			() =>
				Promise.resolve({
					App: 'support-reminders',
				} as Tags),
			'',
		),
	} satisfies AlarmHistoryWithTags,
];
