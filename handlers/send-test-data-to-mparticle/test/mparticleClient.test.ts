import {
	MParticleHttpError,
	MParticleNetworkError,
} from '@modules/mparticle/mparticleHttpClient';
import {
	createMParticleClient,
	type EventsApiClient,
	sendEvents,
} from '../src/mparticleClient';

const payload = {
	user_identities: { customer_id: 'test-browser-id1' },
	user_attributes: { last_single_contribution_amount: 5 },
	environment: 'development',
};

const config = {
	apiKey: 'api-key',
	apiSecret: 'api-secret',
};

const makeClient = (post: jest.Mock): EventsApiClient =>
	({ post }) as unknown as EventsApiClient;

describe('mParticle client adapter', () => {
	it('creates an EU1 Events API client', () => {
		const client = createMParticleClient(config);

		expect(client.clientType).toBe('eventsApi');
		expect(client.baseURL).toBe('https://s2s.eu1.mparticle.com/v2');
	});

	it('posts the complete payload and resolves after a successful response', async () => {
		const post = jest.fn().mockResolvedValue({
			success: true,
			data: undefined,
		});

		await expect(
			sendEvents(makeClient(post), payload),
		).resolves.toBeUndefined();
		expect(post).toHaveBeenCalledWith('/events', payload);
	});

	it('maps HTTP failures without exposing response bodies', async () => {
		const post = jest.fn().mockRejectedValue(new MParticleHttpError(503));

		await expect(sendEvents(makeClient(post), payload)).rejects.toThrow(
			'mParticle Events API request failed with status 503',
		);
	});

	it('maps network failures to a safe error', async () => {
		const post = jest.fn().mockRejectedValue(new MParticleNetworkError());

		await expect(sendEvents(makeClient(post), payload)).rejects.toThrow(
			'mParticle Events API network request failed',
		);
	});

	it('propagates shared-client response errors', async () => {
		const post = jest.fn().mockResolvedValue({
			success: false,
			error: new Error('mParticle response could not be parsed'),
		});

		await expect(sendEvents(makeClient(post), payload)).rejects.toThrow(
			'mParticle response could not be parsed',
		);
	});
});
