import { type SQSEvent } from 'aws-lambda';
import { handler } from '../src';
import { getAppNameTag } from '../src/cloudwatch';

jest.mock('../src/cloudwatch');

describe('Handler', () => {
	const mockEnv = {
		VALUE_WEBHOOK: 'value-webhook-url',
		GROWTH_WEBHOOK: 'growth-webhook-url',
		PP_WEBHOOK: 'pp-webhook-url',
		SRE_WEBHOOK: 'sre-webhook-url',
	};

	const mockCloudWatchAlarmEvent = {
		Records: [
			{
				body: JSON.stringify({
					Message: JSON.stringify({
						AlarmArn: 'mock-arn',
						AlarmName: 'mock-alarm',
						NewStateReason: 'mock-reason',
						AlarmDescription: 'description',
					}),
				}),
			},
		],
	} as SQSEvent;

	const mockSnsPublishMessageEvent = {
		Records: [
			{
				body: JSON.stringify({
					Message: 'mock-message',
					MessageAttributes: {
						app: { Type: 'String', Value: 'mock-app' },
						stage: { Type: 'String', Value: 'CODE' },
					},
				}),
			},
		],
	} as SQSEvent;

	beforeEach(() => {
		jest.resetModules();
		jest.resetAllMocks();
		console.error = jest.fn();
		process.env = { ...mockEnv };
	});

	it('should handle CloudWatch alarm message', async () => {
		(getAppNameTag as jest.Mock).mockResolvedValueOnce('mock-app');

		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(Promise.resolve(new Response(JSON.stringify({}))));

		await handler(mockCloudWatchAlarmEvent);

		expect(getAppNameTag).toHaveBeenCalledWith('mock-arn');
		expect(fetch).toHaveBeenCalledWith(mockEnv.SRE_WEBHOOK, expect.any(Object));
	});

	it('should handle SNS publish message', async () => {
		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(Promise.resolve(new Response(JSON.stringify({}))));

		await handler(mockSnsPublishMessageEvent);

		expect(fetch).toHaveBeenCalledWith(mockEnv.SRE_WEBHOOK, expect.any(Object));
	});

	it('should throw error if the fetch HTTP call fails', async () => {
		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(Promise.reject(new Error('Fetch error')));

		await expect(handler(mockCloudWatchAlarmEvent)).rejects.toThrow(
			'Fetch error',
		);
	});
});
