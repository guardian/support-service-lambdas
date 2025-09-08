import { DataExtensionNames } from '@modules/email/email';
import { Logger } from '@modules/logger';
import { zuoraSubscriptionResponseSchema } from '@modules/zuora/types';
import { validationRequirements } from '../src/eligibilityChecker';
import type { Discount } from '../src/productToDiscountMapping';
import {
	catalog,
	getDiscountFromSubscription,
} from '../src/productToDiscountMapping';
import json from './fixtures/digital-subscriptions/get-discount-test.json';
import student from './fixtures/supporter-plus/student.json';

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
		getDiscountFromSubscription(new Logger(), 'PROD', sub);
	expect(discount).toEqual(expected);
	expect(discountableProductRatePlanId).toEqual(catalog.PROD.digiSub.Annual);
});

test('cant get a discount for a student (fixed term)', () => {
	const sub = zuoraSubscriptionResponseSchema.parse(student);

	const ac2 = () => getDiscountFromSubscription(new Logger(), 'CODE', sub);

	expect(ac2).toThrow(validationRequirements.mustHaveDiscountDefined);
});
