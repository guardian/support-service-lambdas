import { z } from 'zod';
import {
	MParticleHttpClient,
	MParticleHttpError,
	MParticleNetworkError,
} from '../src/mparticleHttpClient';

const apiKey = 'api-key';
const apiSecret = 'api-secret';
const endpoint = 'https://s2s.eu1.mparticle.com/v2';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

describe('MParticleHttpClient', () => {
	it('sends a JSON POST with Basic authentication and parses a typed response', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue(jsonResponse({ accepted: true }, 202));
		const client = new MParticleHttpClient(
			endpoint,
			apiKey,
			apiSecret,
			fetchFn,
		);

		const result = await client.post(
			'/events',
			{ event: 'purchase' },
			z.object({ accepted: z.boolean() }),
		);

		expect(result).toEqual({
			success: true,
			data: { accepted: true },
			statusCode: 202,
		});
		expect(fetchFn).toHaveBeenCalledWith(`${endpoint}/events`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ event: 'purchase' }),
		});
	});

	it('supports response parser functions for non-JSON responses', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue(
				new Response('accepted', {
					status: 200,
					headers: { 'content-type': 'text/plain' },
				}),
			);
		const client = new MParticleHttpClient(
			endpoint,
			apiKey,
			apiSecret,
			fetchFn,
		);

		const result = await client.get('/status', (body, contentType) => ({
			body,
			contentType,
		}));

		expect(result).toEqual({
			success: true,
			data: { body: 'accepted', contentType: 'text/plain' },
			statusCode: 200,
		});
	});

	it('rejects non-2xx responses without exposing the response body or credentials', async () => {
		const privateResponseBody = 'private response body';
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue(new Response(privateResponseBody, { status: 503 }));
		const client = new MParticleHttpClient(
			endpoint,
			apiKey,
			apiSecret,
			fetchFn,
		);

		let error: unknown;
		try {
			await client.post('/events', { event: 'purchase' }, () => undefined);
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(MParticleHttpError);
		expect(error).toMatchObject({ statusCode: 503 });
		expect(String(error)).not.toContain(privateResponseBody);
		expect(String(error)).not.toContain(apiSecret);
	});

	it('turns network failures into safe retryable errors', async () => {
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockRejectedValue(new Error(`${apiSecret} should not escape`));
		const client = new MParticleHttpClient(
			endpoint,
			apiKey,
			apiSecret,
			fetchFn,
		);

		await expect(
			client.post('/events', { event: 'purchase' }, () => undefined),
		).rejects.toBeInstanceOf(MParticleNetworkError);
		await expect(
			client.post('/events', { event: 'purchase' }, () => undefined),
		).rejects.toThrow('network layer');
	});

	it('returns a safe error when a successful response cannot be parsed', async () => {
		const privateResponseBody = '{"unexpected":"private-value"}';
		const fetchFn = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue(
				new Response(privateResponseBody, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);
		const client = new MParticleHttpClient(
			endpoint,
			apiKey,
			apiSecret,
			fetchFn,
		);

		const result = await client.get(
			'/status',
			z.object({ expected: z.string() }),
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.message).toBe(
				'mParticle response could not be parsed',
			);
			expect(result.error.message).not.toContain(privateResponseBody);
			expect(result.error.message).not.toContain(apiSecret);
		}
	});
});
