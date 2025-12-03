import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getLastAmendment } from '../src/amendments';

test('should return undefined when subscription has no amendment (code 50000040)', async () => {
	const mockFetch = jest.fn().mockResolvedValue({
		ok: true,
		headers: {
			entries: () => [['Content-Type', 'application/json; charset=utf-8']],
		},
		text: () =>
			Promise.resolve(
				JSON.stringify({
					success: false,
					processId: 'FF96F5A03C9DC715',
					reasons: [
						{
							code: 50000040,
							message:
								'This is the original subscription and has no amendment.',
						},
					],
					requestId: 'e4e11170-6b27-450c-adf1-f4681de16e21',
				}),
			),
	});

	global.fetch = mockFetch;

	const zuoraClient = new ZuoraClient('CODE');

	const result = await getLastAmendment(zuoraClient, 'A-S12345');
	expect(result).toBeUndefined();
});
