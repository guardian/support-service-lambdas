/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 */
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { addCatalogInformationToPromos } from '@modules/promotions/v2/addCatalogInformationToPromo';
import {
	getPromotions,
	getPromotionsByCodes,
} from '@modules/promotions/v2/getPromotions';
import type {
	Promo,
	PromoWithCatalogInformation,
} from '@modules/promotions/v2/schema';
import { listPromotionsEndpoint } from '../src/listPromotionsEndpoint';

jest.mock('@modules/promotions/v2/getPromotions', () => ({
	getPromotions: jest.fn(),
	getPromotionsByCodes: jest.fn(),
}));
jest.mock('@modules/promotions/v2/addCatalogInformationToPromo', () => ({
	addCatalogInformationToPromos: jest.fn(),
}));

const mockGetPromotions = jest.mocked(getPromotions);
const mockGetPromotionsByCodes = jest.mocked(getPromotionsByCodes);
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

const promoWithOtherCatalogInformation: PromoWithCatalogInformation = {
	...promo,
	promoCode: 'PROMO2',
	appliesTo: {
		...promo.appliesTo,
		catalogRatePlans: [
			{ productKey: 'SupporterPlus', productRatePlanKey: 'Annual' },
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

	it('filters out inactive promotions when active=true is requested', async () => {
		const activePromo: Promo = {
			...promo,
			promoCode: 'ACTIVE',
			startTimestamp: '2000-01-01T00:00:00.000Z',
			endTimestamp: undefined,
		};
		const expiredPromo: Promo = {
			...promo,
			promoCode: 'EXPIRED',
			startTimestamp: '2000-01-01T00:00:00.000Z',
			endTimestamp: '2001-01-01T00:00:00.000Z',
		};
		mockGetPromotions.mockResolvedValue([activePromo, expiredPromo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [{ ...promoWithCatalogInformation, promoCode: 'ACTIVE' }],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			active: true,
		});

		expect(mockAddCatalogInformationToPromos).toHaveBeenCalledWith(
			[activePromo],
			expect.anything(),
		);
		expect(result.statusCode).toBe(200);
	});

	it('filters out active promotions when active=false is requested', async () => {
		const activePromo: Promo = {
			...promo,
			promoCode: 'ACTIVE',
			startTimestamp: '2000-01-01T00:00:00.000Z',
			endTimestamp: undefined,
		};
		const expiredPromo: Promo = {
			...promo,
			promoCode: 'EXPIRED',
			startTimestamp: '2000-01-01T00:00:00.000Z',
			endTimestamp: '2001-01-01T00:00:00.000Z',
		};
		mockGetPromotions.mockResolvedValue([activePromo, expiredPromo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [{ ...promoWithCatalogInformation, promoCode: 'EXPIRED' }],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			active: false,
		});

		expect(mockAddCatalogInformationToPromos).toHaveBeenCalledWith(
			[expiredPromo],
			expect.anything(),
		);
		expect(result.statusCode).toBe(200);
	});

	it('filters promotions by productKey', async () => {
		mockGetPromotions.mockResolvedValue([promo, promo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [
				promoWithCatalogInformation,
				promoWithOtherCatalogInformation,
			],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			productKey: 'SupporterPlus',
			productRatePlanKey: 'Monthly',
		});

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			promotions: [promoWithCatalogInformation],
		});
	});

	it('filters promotions by productKey only, ignoring productRatePlanKey when not provided', async () => {
		mockGetPromotions.mockResolvedValue([promo, promo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [
				promoWithCatalogInformation,
				promoWithOtherCatalogInformation,
			],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			productKey: 'SupporterPlus',
		});

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			promotions: [
				promoWithCatalogInformation,
				promoWithOtherCatalogInformation,
			],
		});
	});

	it('returns no promotions when no catalog rate plan matches the requested productRatePlanKey', async () => {
		mockGetPromotions.mockResolvedValue([promo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [promoWithCatalogInformation],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			productKey: 'SupporterPlus',
			productRatePlanKey: 'Annual',
		});

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ promotions: [] });
	});

	it('fetches by promo code, rather than scanning, when promoCodes is provided', async () => {
		mockGetPromotionsByCodes.mockResolvedValue([promo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [promoWithCatalogInformation],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			promoCodes: ['PROMO1', 'DOES_NOT_EXIST'],
		});

		expect(mockGetPromotionsByCodes).toHaveBeenCalledWith(
			['PROMO1', 'DOES_NOT_EXIST'],
			'CODE',
		);
		expect(mockGetPromotions).not.toHaveBeenCalled();
		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			promotions: [promoWithCatalogInformation],
		});
	});

	it('combines promoCodes with the active and product filters', async () => {
		const activePromo: Promo = {
			...promo,
			promoCode: 'ACTIVE',
			startTimestamp: '2000-01-01T00:00:00.000Z',
			endTimestamp: undefined,
		};
		const expiredPromo: Promo = {
			...promo,
			promoCode: 'EXPIRED',
			startTimestamp: '2000-01-01T00:00:00.000Z',
			endTimestamp: '2001-01-01T00:00:00.000Z',
		};
		mockGetPromotionsByCodes.mockResolvedValue([activePromo, expiredPromo]);
		mockAddCatalogInformationToPromos.mockReturnValue({
			succeeded: [{ ...promoWithCatalogInformation, promoCode: 'ACTIVE' }],
			failed: [],
		});

		const result = await listPromotionsEndpoint('CODE', catalogHelper, {
			promoCodes: ['ACTIVE', 'EXPIRED'],
			active: true,
			productKey: 'SupporterPlus',
			productRatePlanKey: 'Monthly',
		});

		expect(mockAddCatalogInformationToPromos).toHaveBeenCalledWith(
			[activePromo],
			expect.anything(),
		);
		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			promotions: [{ ...promoWithCatalogInformation, promoCode: 'ACTIVE' }],
		});
	});
});
