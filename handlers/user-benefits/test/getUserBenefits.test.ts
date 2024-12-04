import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
	tierThreeBenefits,
} from '@modules/product-benefits/src/productBenefit';
import { getBenefits } from '../src/userBenefits';

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
