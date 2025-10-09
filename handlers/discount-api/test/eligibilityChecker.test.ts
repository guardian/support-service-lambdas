import {
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import {
	billingPreviewSchema,
	zuoraSubscriptionResponseSchema,
} from '@modules/zuora/types';
import { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import catalogJsonProd from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { validationRequirements } from '../src/eligibilityChecker';
import { getDiscountFromSubscription } from '../src/productToDiscountMapping';
import billingPreviewJson2 from './fixtures/billing-previews/eligibility-checker-test2.json';
import subscriptionJson2 from './fixtures/digital-subscriptions/eligibility-checker-test2.json';
import subSupporterPlusFullPrice from './fixtures/supporter-plus/full-price.json';

const catalogProd = new ZuoraCatalogHelper(
	zuoraCatalogSchema.parse(catalogJsonProd),
);

function loadBillingPreview(subscriptionNumber: string, data: unknown) {
	return toSimpleInvoiceItems(
		itemsForSubscription(subscriptionNumber)(billingPreviewSchema.parse(data)),
	);
}

// function asLazy<T>(value: T): () => Promise<T> {
// 	return () => Promise.resolve(value);
// }

// test('Eligibility check fails for a Supporter plus which has already had the offer', async () => {
// 	const sub = zuoraSubscriptionResponseSchema.parse(subscriptionJson1);
// 	const billingPreview = loadBillingPreview('A-S00898839', billingPreviewJson1);
// 	const discount = getDiscountFromSubscription('CODE', sub);
// 	const after2Months = dayjs(sub.contractEffectiveDate)
// 		.add(2, 'months')
// 		.add(1, 'days');
//
// 	const actual = () =>
// 		eligibilityChecker.assertGenerallyEligible(
// 			sub,
// 			0,
// 			asLazy(getNextInvoiceItems(billingPreview)),
// 		);
//
// 	await expect(actual).rejects.toThrow(
// 		validationRequirements.noNegativePreviewItems,
// 	);
//
// 	const ac2 = () =>
// 		eligibilityChecker.assertEligibleForFreePeriod(
// 			discount.discount.productRatePlanId,
// 			sub,
// 			after2Months,
// 		);
//
// 	expect(ac2).toThrow(validationRequirements.notAlreadyUsed);
// });
//
// test('Eligibility check fails where the next payment is zero (i.e. a contribution set to 0 amount)', async () => {
// 	const sub = zuoraSubscriptionResponseSchema.parse(subscriptionJson1);
// 	const billingPreview = loadBillingPreview(
// 		sub.subscriptionNumber,
// 		zeroContributionPreview,
// 	);
//
// 	const actual = () =>
// 		eligibilityChecker.assertGenerallyEligible(
// 			sub,
// 			0,
// 			asLazy(getNextInvoiceItems(billingPreview)),
// 		);
//
// 	await expect(actual).rejects.toThrow(
// 		validationRequirements.nextInvoiceGreaterThanZero,
// 	);
// });
//
// test('Eligibility check fails for a S+ subscription which is on a reduced price', async () => {
// 	const sub = zuoraSubscriptionResponseSchema.parse(subscriptionJson3);
// 	const billingPreview = loadBillingPreview(
// 		sub.subscriptionNumber,
// 		billingPreviewJson1,
// 	);
// 	const discount = getDiscountFromSubscription('CODE', sub);
// 	const after2Months = dayjs(sub.contractEffectiveDate)
// 		.add(2, 'months')
// 		.add(1, 'days');
//
// 	const actual = () =>
// 		eligibilityChecker.assertGenerallyEligible(
// 			sub,
// 			0,
// 			asLazy(getNextInvoiceItems(billingPreview)),
// 		);
//
// 	await expect(actual).rejects.toThrow(
// 		validationRequirements.noNegativePreviewItems,
// 	);
//
// 	//expect to not throw
// 	eligibilityChecker.assertEligibleForFreePeriod(
// 		discount.discount.productRatePlanId,
// 		sub,
// 		after2Months,
// 	);
// });

test('Eligibility check fails for a subscription which hasnt been running long', () => {
	const sub = zuoraSubscriptionResponseSchema.parse(subSupporterPlusFullPrice);
	const discount = getDiscountFromSubscription('CODE', sub);
	const nearlyLongEnough = dayjs(sub.contractEffectiveDate).add(2, 'months');

	const ac1 = validationRequirements.twoMonthsMin.check({
		subscription: sub,
		today: nearlyLongEnough,
	}).isValid;

	expect(ac1).toBe(false);

	const ac2 = validationRequirements.notAlreadyUsed.check({
		discountProductRatePlanId: discount.discountableProductRatePlanId,
		ratePlans: sub.ratePlans,
	}).isValid;

	expect(ac2).toBe(false);
});

test('Eligibility check works for a price risen subscription', () => {
	const sub = zuoraSubscriptionResponseSchema.parse(subscriptionJson2);
	const billingPreview = loadBillingPreview(
		sub.subscriptionNumber,
		billingPreviewJson2,
	);
	const discount = getDiscountFromSubscription('PROD', sub);

	// await eligibilityChecker.assertGenerallyEligible(
	// 	sub,
	// 	0,
	// 	asLazy(getNextInvoiceItems(billingPreview)),
	// );

	// shouldn't throw
	const ac2 = validationRequirements.atLeastCatalogPrice.check({
		catalog: catalogProd,
		invoiceItems: billingPreview,
		discountableProductRatePlanId: discount.discountableProductRatePlanId,
		currency: 'GBP',
	}).isValid;

	expect(ac2).toBe(true);
});

// test('Eligibility check works for supporter plus with 2 rate plans', async () => {
// 	const sub = zuoraSubscriptionResponseSchema.parse(subSupporterPlusFullPrice);
// 	const billingPreview = loadBillingPreview(
// 		sub.subscriptionNumber,
// 		billingPreviewSupporterPlusFullPrice,
// 	);
// 	const discount = getDiscountFromSubscription('CODE', sub);
// 	const after2Months = dayjs(sub.contractEffectiveDate)
// 		.add(2, 'months')
// 		.add(1, 'days');
//
// 	await eligibilityChecker.assertGenerallyEligible(
// 		sub,
// 		0,
// 		asLazy(getNextInvoiceItems(billingPreview)),
// 	);
//
// 	//shouldn't throw
// 	eligibilityChecker.assertEligibleForFreePeriod(
// 		discount.discount.productRatePlanId,
// 		sub,
// 		after2Months,
// 	);
// });
//
// test('Eligibility check fails for a subscription which is cancelled', async () => {
// 	const sub = zuoraSubscriptionResponseSchema.parse(subSupporterPlusFullPrice);
// 	sub.status = 'Cancelled';
// 	expect(subSupporterPlusFullPrice.status).toEqual('Active');
//
// 	const ac2 = () =>
// 		eligibilityChecker.assertGenerallyEligible(sub, 0, () =>
// 			Promise.reject(new Error('should not attempt a BP if its cancelled')),
// 		);
//
// 	await expect(ac2).rejects.toThrow(validationRequirements.isActive);
// });
