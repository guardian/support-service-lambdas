import { logger } from '@modules/logger/logger';
import type { MParticleBatch } from '../src/acquisitions';
import { MParticleClient } from '../src/mparticleClient';

const batch: MParticleBatch = {
	schema_version: 2,
	source_request_id: 'source-request-id',
	environment: 'development',
	events: [
		{
			event_type: 'commerce_event',
			data: {
				event_name: 'purchase',
				product_action: {
					action: 'purchase',
					products: [{ id: 'product', name: 'product', quantity: 1 }],
					transaction_id: 'transaction-id',
				},
				currency_code: 'GBP',
				timestamp_unixtime_ms: 1,
				source_message_id: 'source-request-id',
				custom_attributes: {},
				custom_flags: {},
			},
		},
	],
};

const config = {
	apiKey: 'api-key',
	apiSecret: 'api-secret',
	googleEnhancedConversionsConversionActionId: 'conversion-action',
	endpoint: 'https://example.test/events',
};

describe('MParticleClient', () => {
	it('posts JSON with Basic authentication and accepts 2xx responses', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue(new Response(null, { status: 202 }));
		const logSpy = jest.spyOn(logger, 'log');

		await MParticleClient.create(config, fetchFn).sendEvents(batch);

		expect(fetchFn).toHaveBeenCalledWith(config.endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from('api-key:api-secret').toString('base64')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(batch),
		});
		expect(logSpy.mock.calls.flat()).not.toContain('api-secret');
		logSpy.mockRestore();
	});

	it('rejects non-2xx responses without exposing a response body', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue(
				new Response('private response body', { status: 503 }),
			);

		await expect(
			MParticleClient.create(config, fetchFn).sendEvents(batch),
		).rejects.toThrow('status 503');
	});

	it('rejects network failures with a safe retryable error', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockRejectedValue(new Error('api-secret should not escape'));

		await expect(
			MParticleClient.create(config, fetchFn).sendEvents(batch),
		).rejects.toThrow('network request failed');
	});
});
