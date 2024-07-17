import { zuoraSubscriptionSchema } from '@modules/zuora/zuoraSchemas';
import {
	catalog,
	Discount,
	getDiscountFromSubscription,
} from '../src/productToDiscountMapping';
import json from './fixtures/digital-subscriptions/get-discount-test.json';

test('getDiscountFromSubscription should return an annual discount for an annual sub', () => {
	const sub = zuoraSubscriptionSchema.parse(json);
	const expected: Discount = {
		productRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
		name: 'Cancellation Save Discount - 25% off for 12 months',
		upToPeriods: 12,
		upToPeriodsType: 'Months',
		sendEmail: false,
		eligibilityCheckForRatePlan: 'AtCatalogPrice',
	};
	const { discount, discountableProductRatePlanId } =
		getDiscountFromSubscription('PROD', sub);
	expect(discount).toEqual(expected);
	expect(discountableProductRatePlanId).toEqual(catalog.PROD.digiSub.Annual);
});
