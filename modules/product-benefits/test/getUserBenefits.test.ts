import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
	tierThreeBenefits,
} from '@modules/product-benefits/productBenefit';
import { getBenefits } from '@modules/product-benefits/userBenefits';

test('getUserBenefits', () => {
	expect(getBenefits(['DigitalSubscription'])).toEqual(
		digitalSubscriptionBenefits,
	);
	expect(getBenefits(['GuardianLight'])).toEqual(['rejectTracking']);
	expect(getBenefits(['SupporterPlus'])).toEqual(supporterPlusBenefits);
	expect(getBenefits(['TierThree'])).toEqual(tierThreeBenefits);
	expect(getBenefits(['GuardianWeeklyDomestic'])).toEqual(['fewerSupportAsks']);
	expect(getBenefits([])).toEqual([]);
});

test('getUserBenefits returns distinct benefits', () => {
	expect(getBenefits(['TierThree', 'DigitalSubscription'])).toEqual(
		tierThreeBenefits,
	);
});
