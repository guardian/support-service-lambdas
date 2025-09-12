import type { Logger } from '@modules/routing/logger';
import type { BearerTokenProvider } from '@modules/zuora/auth/bearerTokenProvider';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getLastAmendment } from '../src/amendments';

test('should return undefined when subscription has no amendment (code 50000040)', async () => {
	const mockFetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () =>
			Promise.resolve({
				success: false,
				processId: 'FF96F5A03C9DC715',
				reasons: [
					{
						code: 50000040,
						message: 'This is the original subscription and has no amendment.',
					},
				],
				requestId: 'e4e11170-6b27-450c-adf1-f4681de16e21',
			}),
	});

	global.fetch = mockFetch;

	const mockTokenProvider = {
		getBearerToken: jest.fn().mockResolvedValue({ access_token: 'test_token' }),
	} as Partial<BearerTokenProvider> as BearerTokenProvider;

	const mockLogger = {
		log: jest.fn(),
		error: jest.fn(),
	} as Partial<Logger> as Logger;

	const zuoraClient = new ZuoraClient('CODE', mockTokenProvider, mockLogger);

	const result = await getLastAmendment(zuoraClient, 'A-S12345');
	expect(result).toBeUndefined();
});
