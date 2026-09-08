/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 */
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { addCatalogInformationToPromos } from '@modules/promotions/v2/addCatalogInformationToPromo';
import { getPromotions } from '@modules/promotions/v2/getPromotions';
import type {
	Promo,
	PromoWithCatalogInformation,
} from '@modules/promotions/v2/schema';
import { listPromotionsEndpoint } from '../src/listPromotionsEndpoint';

jest.mock('@modules/promotions/v2/getPromotions', () => ({
	getPromotions: jest.fn(),
}));
jest.mock('@modules/promotions/v2/addCatalogInformationToPromo', () => ({
	addCatalogInformationToPromos: jest.fn(),
}));

const mockGetPromotions = jest.mocked(getPromotions);
const mockAddCatalogInformationToPromos = jest.mocked(
	addCatalogInformationToPromos,
);

const catalogHelper = {} as ProductCatalogHelper;

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

const promoWithCatalogInformation: PromoWithCatalogInformation = {
	...promo,
	appliesTo: {
		...promo.appliesTo,
		catalogRatePlans: [
			{ productKey: 'SupporterPlus', productRatePlanKey: 'Monthly' },
		],
	},
};

describe('listPromotionsEndpoint', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('returns 200 with the list of promotions augmented with catalog information', async () => {
		mockGetPromotions.mockResolvedValue([promo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [promoWithCatalogInformation],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper);

		expect(mockGetPromotions).toHaveBeenCalledWith('CODE');
		expect(mockAddCatalogInformationToPromos).toHaveBeenCalledWith(
			[promo],
			expect.anything(),
		);
		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			promotions: [promoWithCatalogInformation],
		});
	});

	it('excludes promotions that could not be resolved against the product catalog', async () => {
		mockGetPromotions.mockResolvedValue([promo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [],
			failed: [promo],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ promotions: [] });
	});

	it('returns 500 when fetching promotions fails', async () => {
		mockGetPromotions.mockRejectedValue(new Error('dynamodb error'));

		const result = await listPromotionsEndpoint('CODE', catalogHelper);

		expect(result.statusCode).toBe(500);
	});
});
