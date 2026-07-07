import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import codeZuoraCatalog from '../../../zuora-catalog/test/fixtures/catalog-code.json';
import {
	addCatalogInformationToPromo,
	addCatalogInformationToPromos,
	findPromosForProduct,
	promoAppliesTo,
} from '../../src/v2/addCatalogInformationToPromo';

const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(codeZuoraCatalog),
);
const catalogHelper = new ProductCatalogHelper(productCatalog);

const supporterPlusMonthlyId =
	productCatalog.SupporterPlus.ratePlans.Monthly.id;

const buildPromo = (productRatePlanIds: string[]): Promo => ({
	name: 'Test Promotion',
	promoCode: 'TEST123',
	campaignCode: 'campaign',
	startTimestamp: '2024-09-25T23:00:00.000Z',
	endTimestamp: '2099-11-05T23:59:59.000Z',
	discount: {
		amount: 25,
		durationMonths: 3,
	},
	appliesTo: {
		countries: ['GB'],
		productRatePlanIds,
	},
});

describe('addCatalogInformationToPromo', () => {
	it('resolves productRatePlanIds to catalog keys', () => {
		const promosWithCatalogInformation = addCatalogInformationToPromo(
			buildPromo([supporterPlusMonthlyId]),
			catalogHelper,
		);

		expect(
			promosWithCatalogInformation.appliesTo.catalogRatePlans,
		).toStrictEqual([
			{ productKey: 'SupporterPlus', productRatePlanKey: 'Monthly' },
		]);
		// original fields are preserved
		expect(
			promosWithCatalogInformation.appliesTo.productRatePlanIds,
		).toStrictEqual([supporterPlusMonthlyId]);
		expect(promosWithCatalogInformation.appliesTo.countries).toStrictEqual([
			'GB',
		]);
	});

	it('throws if a productRatePlanId is not in the product catalog', () => {
		expect(() =>
			addCatalogInformationToPromo(
				buildPromo(['not-a-real-id']),
				catalogHelper,
			),
		).toThrow(
			'Promotion TEST123 references product rate plan id not-a-real-id which does not exist in the product catalog',
		);
	});
});

describe('findPromosForProduct', () => {
	it('returns only promos whose catalog keys include the queried pair', () => {
		const promos = addCatalogInformationToPromos(
			[buildPromo([supporterPlusMonthlyId]), buildPromo([])],
			catalogHelper,
		);

		const matches = findPromosForProduct(promos, 'SupporterPlus', 'Monthly');

		expect(matches).toHaveLength(1);
		expect(promoAppliesTo(matches[0]!, 'SupporterPlus', 'Monthly')).toBe(true);
	});

	it('returns an empty array when no promo applies', () => {
		const promos = addCatalogInformationToPromos(
			[buildPromo([supporterPlusMonthlyId])],
			catalogHelper,
		);

		expect(
			findPromosForProduct(promos, 'SupporterPlus', 'Annual'),
		).toStrictEqual([]);
	});
});
