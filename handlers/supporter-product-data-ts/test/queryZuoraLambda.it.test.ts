/**
 * @group integration
 */

import { handler } from '../src/lambdas/queryZuoraLambda';

jest.mock('../src/services/configService', () => ({
	ConfigService: jest.fn().mockImplementation(() => ({
		loadZuoraConfig: jest.fn().mockResolvedValue({
			partnerId: 'partner',
			lastSuccessfulQueryTime:
				'2026-03-23T05:20:27.281403501-07:00[America/Los_Angeles]',
			discountProductRatePlanIds: [],
		}),
	})),
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: {
		create: jest.fn().mockResolvedValue({
			post: jest.fn().mockResolvedValue({
				id: 'mock-job-123',
				status: 'submitted',
				batches: [],
			}),
			tokenProvider: {
				getAuthorisation: jest.fn().mockResolvedValue({
					baseUrl: 'https://rest.apisandbox.zuora.com',
					authHeaders: { Authorization: 'Bearer mock-token' },
				}),
			},
		}),
	},
}));

describe('queryZuoraLambda integration', () => {
	test('returns a fetch-results state payload', async () => {
		process.env.STAGE = 'CODE';

		const result = await handler(
			{ queryType: 'incremental' },
			{} as never,
			() => undefined,
		);

		expect(result?.jobId).toContain('mock-job-');
		expect(result?.attemptedQueryTime).toBeDefined();
	});
});
