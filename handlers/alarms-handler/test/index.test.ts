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

	beforeEach(() => {
		jest.resetModules();
		jest.resetAllMocks();
		console.error = jest.fn();
		process.env = { ...mockEnv };
	});

	it('should handle CloudWatch alarm message', async () => {
		const mockEvent = {
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
		};

		(getAppNameTag as jest.Mock).mockResolvedValueOnce('mock-app');

		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(Promise.resolve(new Response(JSON.stringify({}))));

		await handler(mockEvent as SQSEvent);

		expect(getAppNameTag).toHaveBeenCalledWith('mock-arn');
		expect(fetch).toHaveBeenCalledWith(mockEnv.SRE_WEBHOOK, expect.any(Object));
	});

	it('should handle SNS publish message', async () => {
		const mockEvent = {
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
		};

		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(Promise.resolve(new Response(JSON.stringify({}))));

		await handler(mockEvent as SQSEvent);

		expect(fetch).toHaveBeenCalledWith(mockEnv.SRE_WEBHOOK, expect.any(Object));
	});
});
