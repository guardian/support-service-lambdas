import {
	billingPreviewSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/zuoraSchemas';
import { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import catalogJsonCode from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import catalogJsonProd from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { EligibilityChecker } from '../src/eligibilityChecker';
import billingPreviewJson1 from './fixtures/billing-previews/eligibility-checker-test.json';
import billingPreviewJson2 from './fixtures/billing-previews/eligibility-checker-test2.json';
import billingPreviewJson3 from './fixtures/billing-previews/eligibility-checker-test3.json';
import billingPreviewSupporterPlusFullPrice from './fixtures/billing-previews/supporter-plus-fullprice.json';
import subscriptionJson2 from './fixtures/digital-subscriptions/eligibility-checker-test2.json';
import subSupporterPlusFullPrice from './fixtures/supporter-plus/full-price.json';
import subscriptionJson3 from './fixtures/digital-subscriptions/eligibility-checker-test3.json';
import subscriptionJson1 from './fixtures/digital-subscriptions/get-discount-test.json';
import { getDiscountableRatePlan } from '../src/productToDiscountMapping';

test('Eligibility check fails for a subscription which is on a reduced price', () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson1);
	const catalog = new ZuoraCatalogHelper(
		zuoraCatalogSchema.parse(catalogJsonProd),
	);
	const billingPreview = billingPreviewSchema.parse(billingPreviewJson1);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(() => {
		eligibilityChecker.getNextBillingDateIfEligible(
			billingPreview,
			getDiscountableRatePlan(sub),
		);
	}).toThrow('Amount payable for next invoice');
});

test('Eligibility check works for a price risen subscription', () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson2);
	const catalog = new ZuoraCatalogHelper(
		zuoraCatalogSchema.parse(catalogJsonProd),
	);
	const billingPreview = billingPreviewSchema.parse(billingPreviewJson2);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(
		dayjs(
			eligibilityChecker.getNextBillingDateIfEligible(
				billingPreview,
				getDiscountableRatePlan(sub),
			),
		),
	).toEqual(dayjs('2024-02-07'));
});

test('error', () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson3);
	const catalog = new ZuoraCatalogHelper(
		zuoraCatalogSchema.parse(catalogJsonCode),
	);
	const billingPreview = billingPreviewSchema.parse(billingPreviewJson3);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(() => {
		eligibilityChecker.getNextBillingDateIfEligible(
			billingPreview,
			getDiscountableRatePlan(sub),
		);
	}).toThrow('Amount payable for next invoice');
});

test('Eligibility check works for supporter plus with 2 rate plans', () => {
	const sub = zuoraSubscriptionSchema.parse(subSupporterPlusFullPrice);
	const catalog = new ZuoraCatalogHelper(
		zuoraCatalogSchema.parse(catalogJsonCode),
	);
	const billingPreview = billingPreviewSchema.parse(
		billingPreviewSupporterPlusFullPrice,
	);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(
		dayjs(
			eligibilityChecker.getNextBillingDateIfEligible(
				billingPreview,
				getDiscountableRatePlan(sub),
			),
		).format('YYYY-MM-DD'),
	).toEqual('2024-07-04');
});
