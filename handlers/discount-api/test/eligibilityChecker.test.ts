import { ZuoraCatalog } from '@modules/catalog/catalog';
import { catalogSchema } from '@modules/catalog/catalogSchema';
import {
	billingPreviewSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import catalogJson from '../../../modules/catalog/test/fixtures/catalog-prod.json';
import { EligibilityChecker } from '../src/eligibilityChecker';
import billingPreviewJson1 from './fixtures/billing-previews/eligibility-checker-test.json';
import billingPreviewJson2 from './fixtures/billing-previews/eligibility-checker-test2.json';
import subscriptionJson2 from './fixtures/digital-subscriptions/eligibility-checker-test2.json';
import subscriptionJson1 from './fixtures/digital-subscriptions/get-discount-test.json';

test('Eligibility check fails for a subscription which is on a reduced price', () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson1);
	const catalog: ZuoraCatalog = new ZuoraCatalog(
		catalogSchema.parse(catalogJson),
	);
	const billingPreview = billingPreviewSchema.parse(billingPreviewJson1);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(() => {
		eligibilityChecker.getNextBillingDateIfEligible(
			sub,
			billingPreview,
			'8a128adf8b64bcfd018b6b6fdc7674f5',
		);
	}).toThrow('Amount payable for next invoice');
});
test('Eligibility check works for a price risen subscription', () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson2);
	const catalog: ZuoraCatalog = new ZuoraCatalog(
		catalogSchema.parse(catalogJson),
	);
	const billingPreview = billingPreviewSchema.parse(billingPreviewJson2);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(
		dayjs(
			eligibilityChecker.getNextBillingDateIfEligible(
				sub,
				billingPreview,
				'2c92a0ff64176cd40164232c8ec97661',
			),
		),
	).toEqual(dayjs('2024-02-07'));
});
