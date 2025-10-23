import dayjs from 'dayjs';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
} from '@modules/product-benefits/productBenefit';
import {
	getUserBenefitsFromUserProducts,
	getValidUserProducts,
} from '@modules/product-benefits/userBenefits';
import { zuoraDateFormat } from '@modules/zuora/utils';
import codeZuoraCatalog from '../../zuora-catalog/test/fixtures/catalog-code.json';

const codeProductCatalog = generateProductCatalog(codeZuoraCatalog);
const codeCatalogHelper = new ProductCatalogHelper(codeProductCatalog);

describe('getUserProductsFromSupporterProductDataItems', () => {
	test('returns no products when there are no supporter product data items', () => {
		expect(getValidUserProducts(codeCatalogHelper, [])).toEqual([]);
	});

	test('does not return expired products', () => {
		expect(
			getValidUserProducts(codeCatalogHelper, [
				{
					subscriptionName: '123',
					productRatePlanId: '2c92c0f94c510a0d014c569ba8eb45f7',
					productRatePlanName: 'Non Founder Supporter - monthly',
					contractEffectiveDate: '2017-01-19',
					termEndDate: '2017-02-19',
					identityId: '123',
				},
			]),
		).toEqual([]);
	});

	test('does return products which expire today', () => {
		expect(
			getValidUserProducts(codeCatalogHelper, [
				{
					subscriptionName: '123',
					productRatePlanId: '2c92c0f94c510a0d014c569ba8eb45f7',
					productRatePlanName: 'Non Founder Supporter - monthly',
					contractEffectiveDate: zuoraDateFormat(
						dayjs().subtract(1, 'month').startOf('day'),
					),
					termEndDate: zuoraDateFormat(dayjs().startOf('day')),
					identityId: '123',
				},
			]).length,
		).toEqual(1);
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
		digitalSubscriptionBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['GuardianWeeklyDomestic'])).toEqual([
		'hideSupportMessaging',
	]);
	expect(getUserBenefitsFromUserProducts([])).toEqual([]);
});

test('getUserBenefitsFromUserProducts returns distinct benefits', () => {
	expect(
		getUserBenefitsFromUserProducts(['TierThree', 'DigitalSubscription']),
	).toEqual(digitalSubscriptionBenefits);
});

test('getUserBenefitsFromUserProducts returns the union of two benefit sets', () => {
	expect(
		getUserBenefitsFromUserProducts([
			'GuardianAdLite',
			'GuardianWeeklyDomestic',
		]),
	).toEqual(['allowRejectAll', 'hideSupportMessaging']);
});
