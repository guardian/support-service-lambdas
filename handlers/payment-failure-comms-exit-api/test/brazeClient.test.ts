import { BrazeClient } from '../src/clients';

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

const createFetch = (): jest.MockedFunction<typeof fetch> =>
	jest.fn() as jest.MockedFunction<typeof fetch>;

describe('BrazeClient', () => {
	it('posts the exact pf_csr_exit payload to Braze users/track', async () => {
		const fetchFn = createFetch();
		fetchFn.mockResolvedValue(new Response('', { status: 201 }));
		const client = new BrazeClient(
			'https://rest.fra-01.braze.eu',
			'braze-api-key',
			fetchFn,
		);

		await expect(client.sendCustomEvent(payload)).resolves.toBeUndefined();

		expect(fetchFn).toHaveBeenCalledWith(
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
		expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it('rejects a non-successful HTTP response from Braze', async () => {
		const fetchFn = createFetch();
		fetchFn.mockResolvedValue(
			new Response(JSON.stringify({ errors: ['invalid event'] }), {
				status: 400,
			}),
		);
		const client = new BrazeClient('https://braze.example', 'key', fetchFn);

		await expect(client.sendCustomEvent(payload)).rejects.toThrow(
			'Braze /users/track failed with status 400',
		);
	});

	it('rejects a successful HTTP response containing Braze errors', async () => {
		const fetchFn = createFetch();
		fetchFn.mockResolvedValue(
			new Response(JSON.stringify({ errors: ['invalid event'] }), {
				status: 201,
			}),
		);
		const client = new BrazeClient('https://braze.example', 'key', fetchFn);

		await expect(client.sendCustomEvent(payload)).rejects.toThrow(
			'Braze /users/track returned errors',
		);
	});
});
