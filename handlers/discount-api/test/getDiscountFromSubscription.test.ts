import { DataExtensionNames } from '@modules/email/email';
import { zuoraSubscriptionResponseSchema } from '@modules/zuora/types';
import type { Discount } from '../src/productToDiscountMapping';
import {
	catalog,
	getDiscountFromSubscription,
} from '../src/productToDiscountMapping';
import json from './fixtures/digital-subscriptions/get-discount-test.json';

test('getDiscountFromSubscription should return an annual discount for an annual sub', () => {
	const sub = zuoraSubscriptionResponseSchema.parse(json);
	const expected: Discount = {
		productRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
		name: 'Cancellation Save Discount - 25% off for 12 months',
		upToPeriods: 12,
		upToPeriodsType: 'Months',
		discountPercentage: 25,
		emailIdentifier: DataExtensionNames.digipackAnnualDiscountConfirmationEmail,
		eligibilityCheckForRatePlan: 'AtCatalogPrice',
	};
	const { discount, discountableProductRatePlanId } =
		getDiscountFromSubscription('PROD', sub);
	expect(discount).toEqual(expected);
	expect(discountableProductRatePlanId).toEqual(catalog.PROD.digiSub.Annual);
});
