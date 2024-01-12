import { ZuoraCatalog } from '@modules/catalog/catalog';
import { catalogSchema } from '@modules/catalog/catalogSchema';
import {
	billingPreviewSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/zuoraSchemas';
import catalogJson from '../../../modules/catalog/test/fixtures/catalog-prod.json';
import { EligibilityChecker } from '../src/eligibilityChecker';
import billingPreviewJson from './fixtures/billing-previews/eligibility-checker-test.json';
import subscriptionJson from './fixtures/digital-subscriptions/get-discount-test.json';

test('EligibilityChecker', () => {
	const sub = zuoraSubscriptionSchema.parse(subscriptionJson);
	const catalog: ZuoraCatalog = new ZuoraCatalog(
		catalogSchema.parse(catalogJson),
	);
	const billingPreview = billingPreviewSchema.parse(billingPreviewJson);
	const eligibilityChecker = new EligibilityChecker(catalog);
	expect(() => {
		eligibilityChecker.getNextBillingDateIfEligible(
			sub,
			billingPreview,
			'8a128adf8b64bcfd018b6b6fdc7674f5',
		);
	}).toThrow('Amount payable for next invoice');
});
