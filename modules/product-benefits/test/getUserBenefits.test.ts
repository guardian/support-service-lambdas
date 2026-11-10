import dayjs from 'dayjs';
import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
} from '@modules/product-benefits/productBenefit';
import {
	getUserBenefits,
	getUserBenefitsFromUserProducts,
	getValidUserProducts,
} from '@modules/product-benefits/userBenefits';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import codeZuoraCatalog from '../../zuora-catalog/test/fixtures/catalog-code.json';

const codeProductCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(codeZuoraCatalog),
);
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
					contractEffectiveDate: dayjs('2017-01-19'),
					termEndDate: dayjs('2017-02-19'),
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
					contractEffectiveDate: dayjs().subtract(1, 'month').startOf('day'),
					termEndDate: dayjs().startOf('day'),
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
					contractEffectiveDate: dayjs().subtract(2, 'months'),
					termEndDate: dayjs('2099-04-01'),
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
					contractEffectiveDate: dayjs('2021-01-01'),
					termEndDate: dayjs('2099-04-01'),
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
	expect(getUserBenefitsFromUserProducts(['GuardianWeeklyDomestic'])).toEqual(
		digitalSubscriptionBenefits,
	);
	expect(getUserBenefitsFromUserProducts([])).toEqual([]);
});

test('getUserBenefitsFromUserProducts returns distinct benefits', () => {
	expect(
		getUserBenefitsFromUserProducts(['TierThree', 'DigitalSubscription']),
	).toEqual(digitalSubscriptionBenefits);
});

test('getUserBenefitsFromUserProducts returns the union of two benefit sets', () => {
	expect(
		getUserBenefitsFromUserProducts(['GuardianAdLite', 'SupporterMembership']),
	).toEqual([
		'allowRejectAll',
		'liveApp',
		'feastApp',
		'hideSupportMessaging',
		'puzzlePremium',
	]);
});

describe('Premium Puzzles eligibility', () => {
	test.each([
		'SupporterPlus',
		'DigitalSubscription',
		'TierThree',
		'HomeDelivery',
		'NationalDelivery',
		'NewspaperVoucher',
		'SubscriptionCard',
		'GuardianWeeklyDomestic',
		'GuardianWeeklyRestOfWorld',
		'GuardianWeeklyZoneA',
		'GuardianWeeklyZoneB',
		'GuardianWeeklyZoneC',
		'SupporterMembership',
		'PartnerMembership',
		'PatronMembership',
		'GuardianPatron',
	] as const)('grants puzzlePremium to %s', (product) => {
		expect(getUserBenefitsFromUserProducts([product])).toContain(
			'puzzlePremium',
		);
	});

	test.each([
		'InAppPurchase',
		'GuardianAdLite',
		'Contribution',
		'OneTimeContribution',
	] as const)('does not grant puzzlePremium to %s alone', (product) => {
		expect(getUserBenefitsFromUserProducts([product])).not.toContain(
			'puzzlePremium',
		);
	});

	test('grants puzzlePremium once when an IAP user also has eligible subscriptions', () => {
		const benefits = getUserBenefitsFromUserProducts([
			'InAppPurchase',
			'SupporterPlus',
			'SupporterMembership',
		]);
		expect(benefits.filter((benefit) => benefit === 'puzzlePremium')).toEqual([
			'puzzlePremium',
		]);
	});

	test.each(['staff@theguardian.com', 'staff@guardian.co.uk'])(
		'grants puzzlePremium to staff with email %s',
		async (email) => {
			const benefits = await getUserBenefits('CODE', codeCatalogHelper, {
				identityId: 'staff-identity-id',
				email,
			});
			expect(benefits).toContain('puzzlePremium');
		},
	);
});
