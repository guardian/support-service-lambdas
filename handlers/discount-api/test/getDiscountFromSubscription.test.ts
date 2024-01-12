import { zuoraSubscriptionSchema } from '@modules/zuora/zuoraSchemas';
import { getDiscountFromSubscription } from '../src/productToDiscountMapping';
import json from './fixtures/digital-subscriptions/get-discount-test.json';

test('getDiscountFromSubscription should return an annual discount for an annual sub', () => {
	const sub = zuoraSubscriptionSchema.parse(json);
	expect(getDiscountFromSubscription('PROD', sub)).toEqual({
		productRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
		name: 'Cancellation Save Discount - 25% off for 12 months',
		upToPeriods: 12,
		upToPeriodsType: 'Months',
		effectiveStartDate: '2023-10-26',
		effectiveEndDate: '2099-03-08',
		eligibleProductRatePlanIds: ['2c92a0fb4edd70c8014edeaa4e972204'],
	});
});
