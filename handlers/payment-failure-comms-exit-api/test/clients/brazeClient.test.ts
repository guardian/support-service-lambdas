import { RestClientError } from '@modules/zuora/restClient';
import { BrazeClient } from '../../src/clients/brazeClient';

const payload = {
	events: [
		{
			external_id: 'braze-uuid',
			app_id: 'payment-failure-braze-app',
			name: 'pf_csr_exit' as const,
			time: '2026-09-08T12:00:00.000Z',
			_update_existing_only: true as const,
		},
	],
};

describe('BrazeClient', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('posts the exact pf_csr_exit payload to Braze users/track', async () => {
		const fetchSpy = jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(
				new Response(JSON.stringify({ message: 'success' }), { status: 201 }),
			);
		const client = new BrazeClient(
			'https://rest.fra-01.braze.eu',
			'braze-api-key',
		);

		await expect(client.sendCustomEvent(payload)).resolves.toBeUndefined();

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://rest.fra-01.braze.eu/users/track',
			expect.objectContaining({
				method: 'POST',
				headers: {
					Authorization: 'Bearer braze-api-key',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			}),
		);
		expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it('rejects a non-successful HTTP response', async () => {
		jest.spyOn(global, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ errors: ['invalid event'] }), {
				status: 400,
			}),
		);
		const client = new BrazeClient('https://braze.example', 'key');

		await expect(client.sendCustomEvent(payload)).rejects.toMatchObject({
			name: 'RestClientError',
			status: 400,
			responseBody: { errors: ['invalid event'] },
		});
	});

	it('rejects a successful HTTP response containing Braze errors', async () => {
		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(
				new Response(
					JSON.stringify({ message: 'success', errors: ['invalid event'] }),
					{ status: 201 },
				),
			);
		const client = new BrazeClient('https://braze.example', 'key');

		await expect(client.sendCustomEvent(payload)).rejects.toThrow(
			'Braze /users/track returned errors',
		);
	});

	it('accepts a successful response with an empty Braze error list', async () => {
		jest.spyOn(global, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ message: 'success', errors: [] }), {
				status: 201,
			}),
		);
		const client = new BrazeClient('https://braze.example', 'key');

		await expect(client.sendCustomEvent(payload)).resolves.toBeUndefined();
	});

	it('rejects an empty successful response rather than treating it as an object', async () => {
		jest
			.spyOn(global, 'fetch')
			.mockResolvedValue(new Response('', { status: 201 }));
		const client = new BrazeClient('https://braze.example', 'key');

		await expect(client.sendCustomEvent(payload)).rejects.toBeInstanceOf(
			RestClientError,
		);
	});
});
