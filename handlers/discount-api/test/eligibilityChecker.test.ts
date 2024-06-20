import {
	billingPreviewSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import {
	EligibilityChecker,
	validationRequirements,
} from '../src/eligibilityChecker';
import catalogJsonProd from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import billingPreviewJson1 from './fixtures/billing-previews/eligibility-checker-test.json';
import billingPreviewJson2 from './fixtures/billing-previews/eligibility-checker-test2.json';
import billingPreviewSupporterPlusFullPrice from './fixtures/billing-previews/supporter-plus-fullprice.json';
import subscriptionJson2 from './fixtures/digital-subscriptions/eligibility-checker-test2.json';
import subSupporterPlusFullPrice from './fixtures/supporter-plus/full-price.json';
import subscriptionJson3 from './fixtures/digital-subscriptions/eligibility-checker-test3.json';
import subscriptionJson1 from './fixtures/supporter-plus/free-2-months.json';
import {
	billingPreviewToSimpleInvoiceItems,
	getNextInvoiceItems,
} from '@modules/zuora/billingPreview';
import { getDiscountFromSubscription } from '../src/productToDiscountMapping';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';

const eligibilityChecker = new EligibilityChecker('A-S001');
const catalogProd = new ZuoraCatalogHelper(
	zuoraCatalogSchema.parse(catalogJsonProd),
);

function loadBillingPreview(data: any) {
	return billingPreviewToSimpleInvoiceItems(billingPreviewSchema.parse(data));
}

test('Eligibility check fails for a Supporter plus which has already had the offer', async () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson1);
	const billingPreview = loadBillingPreview(billingPreviewJson1);
	const discount = getDiscountFromSubscription('CODE', sub);

	const actual = () =>
		eligibilityChecker.assertGenerallyEligible(
			sub,
			0,
			getNextInvoiceItems(billingPreview).items,
		);

	expect(actual).toThrow(validationRequirements.noNegativePreviewItems);

	const ac2 = () =>
		eligibilityChecker.assertEligibleForFreePeriod(
			discount.discount.productRatePlanId,
			sub,
			dayjs('2024-09-01'),
		);

	expect(ac2).toThrow(validationRequirements.notAlreadyUsed);
});

test('Eligibility check fails for a S+ subscription which is on a reduced price', async () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson3);
	const billingPreview = loadBillingPreview(billingPreviewJson1);
	const discount = getDiscountFromSubscription('CODE', sub);

	const actual = () =>
		eligibilityChecker.assertGenerallyEligible(
			sub,
			0,
			getNextInvoiceItems(billingPreview).items,
		);

	expect(actual).toThrow(validationRequirements.noNegativePreviewItems);

	//expect to not throw
	eligibilityChecker.assertEligibleForFreePeriod(
		discount.discount.productRatePlanId,
		sub,
		dayjs('2024-08-20'),
	);
});

test('Eligibility check fails for a subscription which hasnt been running long', async () => {
	const sub = zuoraSubscriptionSchema.parse(subSupporterPlusFullPrice);
	const discount = getDiscountFromSubscription('CODE', sub);

	const ac2 = () =>
		eligibilityChecker.assertEligibleForFreePeriod(
			discount.discount.productRatePlanId,
			sub,
			dayjs('2024-08-04'),
		);

	expect(ac2).toThrow(validationRequirements.twoMonthsMin);
});

test('Eligibility check works for a price risen subscription', async () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson2);
	const billingPreview = loadBillingPreview(billingPreviewJson2);
	const discount = getDiscountFromSubscription('PROD', sub);

	eligibilityChecker.assertGenerallyEligible(
		sub,
		0,
		getNextInvoiceItems(billingPreview).items,
	);

	// shouldn't throw
	eligibilityChecker.assertNextPaymentIsAtCatalogPrice(
		catalogProd,
		billingPreview,
		discount.discountableProductRatePlanId,
		'GBP',
	);
});

test('Eligibility check works for supporter plus with 2 rate plans', async () => {
	const sub = zuoraSubscriptionSchema.parse(subSupporterPlusFullPrice);
	const billingPreview = loadBillingPreview(
		billingPreviewSupporterPlusFullPrice,
	);
	const discount = getDiscountFromSubscription('CODE', sub);

	eligibilityChecker.assertGenerallyEligible(
		sub,
		0,
		getNextInvoiceItems(billingPreview).items,
	);

	//shouldn't throw
	eligibilityChecker.assertEligibleForFreePeriod(
		discount.discount.productRatePlanId,
		sub,
		dayjs('2024-08-05'),
	);
});
