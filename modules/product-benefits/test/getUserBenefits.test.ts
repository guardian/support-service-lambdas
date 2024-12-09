import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
	tierThreeBenefits,
} from '@modules/product-benefits/productBenefit';
import { getUserBenefitsFromUserProducts } from '@modules/product-benefits/userBenefits';

test('getUserBenefitsFromUserProducts', () => {
	expect(getUserBenefitsFromUserProducts(['DigitalSubscription'])).toEqual(
		digitalSubscriptionBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['GuardianLight'])).toEqual([
		'rejectTracking',
	]);
	expect(getUserBenefitsFromUserProducts(['SupporterPlus'])).toEqual(
		supporterPlusBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['TierThree'])).toEqual(
		tierThreeBenefits,
	);
	expect(getUserBenefitsFromUserProducts(['GuardianWeeklyDomestic'])).toEqual([
		'fewerSupportAsks',
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
			'GuardianLight',
			'GuardianWeeklyDomestic',
		]),
	).toEqual(['rejectTracking', 'fewerSupportAsks']);
});
