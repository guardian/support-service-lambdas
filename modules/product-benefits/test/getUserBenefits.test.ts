import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import dayjs from 'dayjs';
import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
	tierThreeBenefits,
} from '@modules/product-benefits/productBenefit';
import type { UserBenefitsOverrides } from '@modules/product-benefits/schemas';
import {
	getUserBenefits,
	getUserBenefitsFromUserProducts,
	getValidUserProducts,
} from '@modules/product-benefits/userBenefits';
import codeZuoraCatalog from '../../zuora-catalog/test/fixtures/catalog-code.json';

const codeProductCatalog = generateProductCatalog(codeZuoraCatalog);
const codeCatalogHelper = new ProductCatalogHelper(codeProductCatalog);

describe('getUserProductsFromSupporterProductDataItems', () => {
	test('returns no products when there are no supporter product data items', () => {
		expect(getValidUserProducts(codeCatalogHelper, [])).toEqual([]);
	});

	test('returns single contribution when there is a single contribution less than 3 months old', () => {
		expect(
			getValidUserProducts(codeCatalogHelper, [
				{
					subscriptionName: '123',
					productRatePlanId: 'single_contribution',
					productRatePlanName: 'Single Contribution',
					contractEffectiveDate: zuoraDateFormat(dayjs().subtract(2, 'months')),
					termEndDate: '2099-04-01',
					identityId: '123',
				},
			]),
		).toEqual(['OneTimeContribution']);
	});

	test('returns no products when there are single contributions older than 3 months', () => {
		expect(
			getValidUserProducts(codeCatalogHelper, [
				{
					subscriptionName: '123',
					productRatePlanId: 'single_contribution',
					productRatePlanName: 'Single Contribution',
					contractEffectiveDate: '2021-01-01',
					termEndDate: '2099-04-01',
					identityId: '123',
				},
			]),
		).toEqual([]);
	});
});

test('getUserBenefitsFromUserProducts', () => {
	expect(getUserBenefitsFromUserProducts(['DigitalSubscription'])).toEqual(
		digitalSubscriptionBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['GuardianAdLite'])).toEqual([
		'allowRejectAll',
	]);
	expect(getUserBenefitsFromUserProducts(['SupporterPlus'])).toEqual(
		supporterPlusBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['TierThree'])).toEqual(
		tierThreeBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['GuardianWeeklyDomestic'])).toEqual([
		'hideSupportMessaging',
	]);
	expect(getUserBenefitsFromUserProducts([])).toEqual([]);
});

test('getUserBenefitsFromUserProducts returns distinct benefits', () => {
	expect(
		getUserBenefitsFromUserProducts(['TierThree', 'DigitalSubscription']),
	).toEqual(tierThreeBenefits);
});

test('getUserBenefitsFromUserProducts returns the union of two benefit sets', () => {
	expect(
		getUserBenefitsFromUserProducts([
			'GuardianAdLite',
			'GuardianWeeklyDomestic',
		]),
	).toEqual(['allowRejectAll', 'hideSupportMessaging']);
});

test('User benefits overrides work correctly', async () => {
	const overrides: UserBenefitsOverrides = {
		userOverrides: [
			{
				identityId: '12345',
				benefits: ['feastApp', 'adFree'],
			},
		],
	};
	const benefits = await getUserBenefits(
		'CODE',
		{} as ProductCatalogHelper,
		overrides,
		{
			email: 'test@test.com',
			identityId: '12345',
		},
	);
	expect(benefits).toEqual(['feastApp', 'adFree']);
});
