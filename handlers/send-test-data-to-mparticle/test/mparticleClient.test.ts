import {
	MPARTICLE_EVENTS_ENDPOINT,
	MParticleClient,
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

type FetchMock = jest.MockedFunction<typeof fetch>;

const makeFetchMock = (): FetchMock =>
	jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

describe('MParticleClient', () => {
	it('posts JSON with Basic authentication and returns a 2xx status', async () => {
		const fetchMock = makeFetchMock();
		fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
		const logSpy = jest.spyOn(console, 'log');

		const status = await MParticleClient.create(config, fetchMock).sendEvents(
			payload,
		);

		expect(status).toBe(202);
		expect(fetchMock).toHaveBeenCalledWith(MPARTICLE_EVENTS_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from('api-key:api-secret').toString('base64')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		expect(logSpy).not.toHaveBeenCalled();
		logSpy.mockRestore();
	});

	it('rejects non-2xx responses without exposing the response body', async () => {
		const fetchMock = makeFetchMock();
		fetchMock.mockResolvedValue(
			new Response('private response body', { status: 503 }),
		);

		await expect(
			MParticleClient.create(config, fetchMock).sendEvents(payload),
		).rejects.toThrow('mParticle Events API request failed with status 503');
		await expect(
			MParticleClient.create(config, fetchMock).sendEvents(payload),
		).rejects.not.toThrow('private response body');
	});

	it('rejects network failures with a safe error', async () => {
		const fetchMock = makeFetchMock();
		fetchMock.mockRejectedValue(new Error('secret transport detail'));

		await expect(
			MParticleClient.create(config, fetchMock).sendEvents(payload),
		).rejects.toThrow('mParticle Events API network request failed');
	});
});
