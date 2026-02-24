import type { SNSEventRecord, SQSRecord } from 'aws-lambda';
import type { Services } from '../src';
import { getChatMessages, handlerWithStage } from '../src';
import { buildAlarmMappings } from '../src/alarmMappings';
import type { WebhookUrls } from '../src/configSchema';

describe('Handler', () => {
	const mockWebhookUrls: WebhookUrls = {
		VALUE: 'value-webhook-url',
		GROWTH: 'growth-webhook-url',
		SRE: 'sre-webhook-url',
		PORTFOLIO: 'portfolio-webhook-url',
		PLATFORM: 'platform-webhook-url',
		ENGINE: 'engine-webhook-url',
		PUZZLES: 'puzzles-webhook-url',
	};

	const mockCloudWatchAlarmEvent = {
		body: JSON.stringify({
			Message: JSON.stringify({
				AlarmArn: 'mock-arn',
				AlarmName: 'mock-alarm',
				NewStateReason: 'mock-reason',
				NewStateValue: 'ALARM',
				AlarmDescription: 'description',
				AWSAccountId: '111111',
				StateChangeTime: '2024-10-09T07:23:16.236+0000',
			}),
		}),
	} as SQSRecord;

	const mockSnsPublishMessageEvent = {
		body: JSON.stringify({
			Message: 'mock-message',
			MessageAttributes: {
				app: { Type: 'String', Value: 'mock-app' },
				stage: { Type: 'String', Value: 'PROD' },
			},
		}),
	} as SQSRecord;

	beforeEach(() => {
		jest.resetModules();
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	const getTags = jest.fn();

	const sendChatMessage = jest.fn();
	const mockServices: Services = {
		webhookUrls: mockWebhookUrls,
		getTags,
		googleChatSendMessage: {
			sendChatMessage,
		} as unknown as Services['googleChatSendMessage'],
	};

	it('should handle CloudWatch alarm message', async () => {
		getTags.mockResolvedValueOnce({
			App: 'mock-app',
		});

		await handlerWithStage(mockCloudWatchAlarmEvent, mockServices);

		expect(getTags).toHaveBeenCalledWith('mock-arn', '111111');
		expect(sendChatMessage).toHaveBeenCalledWith(
			mockWebhookUrls.SRE,
			expect.any(Object),
		);
	});

	it('should handle captured CloudWatch alarm message', async () => {
		getTags.mockResolvedValueOnce({
			App: 'mock-app',
			DiagnosticLinks: 'lambda:mock-app-CODE',
		});

		const result = await getChatMessages(
			fullCloudWatchAlarmEvent,
			buildAlarmMappings({ SRE: ['mock-app'] }),
			getTags,
			mockWebhookUrls,
		);

		expect(getTags).toHaveBeenCalledWith(
			'arn:aws:cloudwatch:eu-west-1:1234:alarm:DISCOUNT-API-CODE Discount-api 5XX response',
			'1234',
		);
		const expectedText = buildExpectedAlarmMessage([
			'<a href="https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fmock-app-CODE/log-events$3Fstart$3D1728458220000$26filterPattern$3D$26end$3D1728458580000">Logs for mock-app-CODE between 07:17 and 07:23</a>',
		]);
		expect(result?.webhookUrls).toEqual([mockWebhookUrls.SRE]);
		expect(result?.body).toEqual(expectedText);
	});

	it('should not insert if the DiagnosticUrls are empty', async () => {
		getTags.mockResolvedValueOnce({ App: 'mock-app' });

		const result = await getChatMessages(
			fullCloudWatchAlarmEvent,
			buildAlarmMappings({ SRE: ['mock-app'] }),
			getTags,
			mockWebhookUrls,
		);

		expect(getTags).toHaveBeenCalledWith(
			'arn:aws:cloudwatch:eu-west-1:1234:alarm:DISCOUNT-API-CODE Discount-api 5XX response',
			'1234',
		);
		const expectedText = buildExpectedAlarmMessage();
		expect(result?.webhookUrls).toEqual([mockWebhookUrls.SRE]);
		expect(result?.body).toEqual(expectedText);
	});

	it('should add multiple urls where specified', async () => {
		getTags.mockResolvedValueOnce({
			App: 'mock-app',
			DiagnosticLinks: ['lambda:mock-app-CODE', 'lambda:another-app-CODE'].join(
				' ',
			),
		});

		const result = await getChatMessages(
			fullCloudWatchAlarmEvent,
			buildAlarmMappings({ SRE: ['mock-app'] }),
			getTags,
			mockWebhookUrls,
		);

		expect(getTags).toHaveBeenCalledWith(
			'arn:aws:cloudwatch:eu-west-1:1234:alarm:DISCOUNT-API-CODE Discount-api 5XX response',
			'1234',
		);
		const expectedText = buildExpectedAlarmMessage([
			'<a href="https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fmock-app-CODE/log-events$3Fstart$3D1728458220000$26filterPattern$3D$26end$3D1728458580000">Logs for mock-app-CODE between 07:17 and 07:23</a>',
			'<a href="https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fanother-app-CODE/log-events$3Fstart$3D1728458220000$26filterPattern$3D$26end$3D1728458580000">Logs for another-app-CODE between 07:17 and 07:23</a>',
		]);
		expect(result?.webhookUrls).toEqual([mockWebhookUrls.SRE]);
		expect(result?.body).toEqual(expectedText);
	});

	it('should handle SNS publish message', async () => {
		await handlerWithStage(mockSnsPublishMessageEvent, mockServices);

		expect(sendChatMessage).toHaveBeenCalledWith(
			mockWebhookUrls.SRE,
			expect.any(Object),
		);
	});

	it('should throw error if the fetch HTTP call fails', async () => {
		getTags.mockResolvedValueOnce({ App: 'mock-app' });
		sendChatMessage.mockResolvedValue(Promise.reject(new Error('Fetch error')));

		await expect(
			handlerWithStage(mockCloudWatchAlarmEvent, mockServices),
		).rejects.toThrow('Fetch error');
	});

	it('calls the webhook with the correct data for an OK action', async () => {
		getTags.mockResolvedValueOnce({ App: 'mock-app' });
		const mockCloudWatchOkEvent = {
			body: JSON.stringify({
				Message: JSON.stringify({
					AlarmArn: 'mock-arn',
					AlarmName: 'mock-alarm',
					NewStateReason: 'mock-reason',
					NewStateValue: 'OK',
					AlarmDescription: 'description',
					AWSAccountId: '111111',
					StateChangeTime: '2024-10-09T07:23:16.236+0000',
				}),
			}),
		} as SQSRecord;

		await handlerWithStage(mockCloudWatchOkEvent, mockServices);

		/* eslint-disable @typescript-eslint/no-unsafe-assignment -- not sure the fix */
		expect(sendChatMessage).toHaveBeenCalledWith(
			mockWebhookUrls.SRE,
			expect.objectContaining({
				cardsV2: expect.arrayContaining([
					expect.objectContaining({
						card: expect.objectContaining({
							header: expect.objectContaining({
								title: 'mock-alarm',
							}),
							sections: expect.arrayContaining([
								expect.objectContaining({
									widgets: expect.arrayContaining([
										expect.objectContaining({
											textParagraph: expect.objectContaining({
												text: expect.stringContaining('has recovered'),
											}),
										}),
									]),
								}),
							]),
						}),
					}),
				]),
				text: 'mock-alarm',
			}),
		);
		/* eslint-enable @typescript-eslint/no-unsafe-assignment */
	});
});

const fullCloudWatchAlarmEvent = JSON.stringify({
	Type: 'Notification',
	MessageId: 'sdkfjhslkdfhjksjdhfkjsdhf',
	TopicArn: 'arn:aws:sns:eu-west-1:123456:alarms-handler-topic-CODE',
	Subject:
		'ALARM: "DISCOUNT-API-CODE Discount-api 5XX response" in EU (Ireland)',
	Message: JSON.stringify({
		AlarmName: 'DISCOUNT-API-CODE Discount-api 5XX response',
		AlarmDescription:
			'Impact - Discount api returned a 5XX response check the logs for more information: https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fdiscount-api-CODE. Follow the process in https://docs.google.com/document/d/sdkjfhskjdfhksjdhf/edit',
		AWSAccountId: '1234',
		AlarmConfigurationUpdatedTimestamp: '2024-09-23T09:21:15.363+0000',
		NewStateValue: 'ALARM',
		NewStateReason:
			'Threshold Crossed: 1 datapoint [2.0 (09/10/24 07:18:00)] was greater than or equal to the threshold (1.0).',
		StateChangeTime: '2024-10-09T07:23:16.236+0000',
		Region: 'EU (Ireland)',
		AlarmArn:
			'arn:aws:cloudwatch:eu-west-1:1234:alarm:DISCOUNT-API-CODE Discount-api 5XX response',
		OldStateValue: 'OK',
		OKActions: [],
		AlarmActions: ['arn:aws:sns:eu-west-1:1234:alarms-handler-topic-CODE'],
		InsufficientDataActions: [],
		Trigger: {
			MetricName: '5XXError',
			Namespace: 'AWS/ApiGateway',
			StatisticType: 'Statistic',
			Statistic: 'SUM',
			Unit: null,
			Dimensions: [[Object]],
			Period: 300,
			EvaluationPeriods: 1,
			ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			Threshold: 1,
			TreatMissingData: '',
			EvaluateLowSampleCountPercentile: '',
		},
	}),
	Timestamp: '2024-10-09T07:23:16.318Z',
	SignatureVersion: '1',
	Signature: 'skjefhksjdhfkjsdhfkjsdhfkjsdf==',
	SigningCertUrl: 'https://sns.eu-west-1.amazonaws.com/smhdfsmdfhgsdjf.pem',
	UnsubscribeUrl:
		'https://sns.eu-west-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-1:1234:alarms-handler-topic-CODE:sdkjfhsdkjfhskdjf',
	MessageAttributes: {},
} satisfies SNSEventRecord['Sns']);

const buildExpectedAlarmMessage = (logLinks: string[] = []) => ({
	text: 'DISCOUNT-API-CODE Discount-api 5XX response',
	cardsV2: [
		{
			card: {
				header: {
					title: 'DISCOUNT-API-CODE Discount-api 5XX response',
				},
				sections: [
					{
						widgets: [
							{
								textParagraph: {
									text: '🚨 <a href="https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/DISCOUNT-API-CODE%20Discount-api%205XX%20response">Alarm</a> has triggered!',
								},
							},
							{
								columns: {
									columnItems: [
										{
											horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
											widgets: [
												{
													textParagraph: {
														text: '<b>Reason</b>',
													},
												},
											],
										},
										{
											horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
											widgets: [
												{
													textParagraph: {
														text: 'Threshold Crossed: 1 datapoint [2.0 (09/10/24 07:18:00)] was greater than or equal to the threshold (1.0).',
													},
												},
											],
										},
									],
								},
							},
							...logLinks.map((link) => ({
								textParagraph: { text: link },
							})),
							{
								textParagraph: {
									text: 'Impact - Discount api returned a 5XX response check the logs for more information: https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fdiscount-api-CODE. Follow the process in https://docs.google.com/document/d/sdkjfhskjdfhksjdhf/edit',
								},
							},
						],
					},
				],
			},
			cardId: 'cloudwatch-alarm',
		},
	],
});
