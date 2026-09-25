import { logger } from '@modules/logger/logger';
import { type MParticleEventBatch, uploadEventBatch } from '../src/events';
import {
	createEventsApiClient,
	eventsApiBaseUrl,
} from '../src/mparticleHttpClient';

const apiKey = 'api-key';
const apiSecret = 'api-secret';
const pod = 'eu1';
const endpoint = eventsApiBaseUrl(pod);

const batch: MParticleEventBatch = {
	schema_version: 2,
	source_request_id: 'source-request-id',
	environment: 'development',
	events: [
		{
			event_type: 'commerce_event',
			data: {
				event_name: 'purchase',
				currency_code: 'GBP',
				timestamp_unixtime_ms: 1,
				source_message_id: 'source-request-id',
			},
		},
	],
};

const mockFetch = (response: Response) =>
	jest
		.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
		.mockResolvedValue(response);

const eventsClient = (fetchFn: typeof fetch) =>
	createEventsApiClient({ key: apiKey, secret: apiSecret }, pod, fetchFn);

describe('uploadEventBatch', () => {
	it('posts the batch as JSON to the events path with Basic authentication', async () => {
		const fetchFn = mockFetch(new Response(null, { status: 202 }));
		const logSpy = jest.spyOn(logger, 'log');

		await uploadEventBatch(eventsClient(fetchFn), batch);

		expect(fetchFn).toHaveBeenCalledWith(`${endpoint}/events`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(batch),
		});
		expect(logSpy.mock.calls.flat()).not.toContain(apiSecret);
		logSpy.mockRestore();
	});

	it('rejects non-2xx responses without exposing a response body', async () => {
		const fetchFn = mockFetch(
			new Response('private response body', { status: 503 }),
		);

		await expect(
			uploadEventBatch(eventsClient(fetchFn), batch),
		).rejects.toThrow('status 503');
	});

	it('rejects network failures with a safe retryable error', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockRejectedValue(new Error(`${apiSecret} should not escape`));

		await expect(
			uploadEventBatch(eventsClient(fetchFn), batch),
		).rejects.toThrow('network request failed');
	});

	it('rejects a batch that does not match the Events API models', async () => {
		const fetchFn = mockFetch(new Response(null, { status: 202 }));

		await expect(
			uploadEventBatch(eventsClient(fetchFn), {
				...batch,
				environment: 'staging',
			} as unknown as MParticleEventBatch),
		).rejects.toThrow();
		expect(fetchFn).not.toHaveBeenCalled();
	});
});
