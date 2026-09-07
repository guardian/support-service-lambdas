/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 */
import { getPromotions } from '@modules/promotions/v2/getPromotions';
import type { Promo } from '@modules/promotions/v2/schema';
import { listPromotionsEndpoint } from '../src/listPromotionsEndpoint';

jest.mock('@modules/promotions/v2/getPromotions', () => ({
	getPromotions: jest.fn(),
}));

const mockGetPromotions = jest.mocked(getPromotions);

const promo: Promo = {
	promoCode: 'PROMO1',
	name: 'A promotion',
	campaignCode: 'CAMPAIGN1',
	appliesTo: {
		productRatePlanIds: ['rate-plan-id'],
		countries: ['GB'],
	},
	startTimestamp: '2024-01-01T00:00:00.000Z',
	endTimestamp: undefined,
	discount: undefined,
	description: undefined,
	landingPage: undefined,
};

describe('listPromotionsEndpoint', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('returns 200 with the list of promotions for the given stage', async () => {
		mockGetPromotions.mockResolvedValue([promo]);

		const result = await listPromotionsEndpoint('CODE');

		expect(mockGetPromotions).toHaveBeenCalledWith('CODE');
		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ promotions: [promo] });
	});

	it('returns 500 when fetching promotions fails', async () => {
		mockGetPromotions.mockRejectedValue(new Error('dynamodb error'));

		const result = await listPromotionsEndpoint('CODE');

		expect(result.statusCode).toBe(500);
	});
});
