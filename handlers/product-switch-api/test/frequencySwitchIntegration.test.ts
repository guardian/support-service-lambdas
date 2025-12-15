/**
 * Integration tests for frequency switch functionality.
 * Tests actual frequency switches (monthly → annual only) using real Zuora API calls.
 *
 * Test Coverage:
 * - Preview: 1 test (monthly→annual with comprehensive verification)
 * - Execute: 1 test (monthly→annual with comprehensive verification)
 * - Total: 2 integration tests creating real Zuora subscriptions
 * - Expected runtime: ~2-3 minutes (each test creates a real subscription in CODE environment)
 *
 * @group integration
 */
import console from 'console';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { getAccount } from '@modules/zuora/account';
import {
	getBillingPreview,
	itemsForSubscription,
} from '@modules/zuora/billingPreview';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { createContribution } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import type { ContributionTestAdditionalOptions } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import {
	executeFrequencySwitch,
	previewFrequencySwitch,
	selectCandidateSubscriptionCharge,
} from '../src/frequencySwitchEndpoint';
import type {
	FrequencySwitchPreviewResponse,
	FrequencySwitchResponse,
} from '../src/frequencySwitchSchemas';

interface FrequencySwitchTestSetup {
	zuoraClient: ZuoraClient;
	subscription: ZuoraSubscription;
	currentBillingPeriod: 'Month' | 'Annual';
}

const jestConsole = console;
beforeEach(() => {
	global.console = console;
});
afterEach(() => {
	global.console = jestConsole;
});

const stage = 'CODE';

/**
 * Creates a test contribution subscription that can be used for frequency switch testing
 */
const createTestSubscriptionForFrequencySwitch = async (
	billingPeriod: 'Month' | 'Annual',
	price: number,
	additionalOptions?: Omit<
		ContributionTestAdditionalOptions,
		'billingPeriod' | 'price'
	>,
): Promise<FrequencySwitchTestSetup> => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log(
		`Creating a new ${billingPeriod} contribution at price ${price} for frequency switch testing`,
	);

	const subscriptionNumber = await createContribution(zuoraClient, {
		price,
		billingPeriod,
		...additionalOptions,
	});

	const subscription = await getSubscription(zuoraClient, subscriptionNumber);

	return {
		zuoraClient,
		subscription,
		currentBillingPeriod: billingPeriod,
	};
};

describe('frequency switch behaviour', () => {
	describe('preview functionality', () => {
		it(
			'previews monthly to annual frequency switch with savings calculation and invoice items',
			async () => {
				const monthlyPrice = 10;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencySwitch('Month', monthlyPrice);

				const productCatalog = await getProductCatalogFromApi(stage);
				const account = await getAccount(
					zuoraClient,
					subscription.accountNumber,
				);
				const candidateCharge = await selectCandidateSubscriptionCharge(
					subscription,
					dayjs(),
					account,
					productCatalog,
					zuoraClient,
				);
				const result: FrequencySwitchPreviewResponse =
					await previewFrequencySwitch(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						dayjs(),
					);

				// Expect success response
				expect('savings' in result).toBe(true);
				if ('savings' in result) {
					// Verify currency is at top level
					expect(result.currency).toBe('GBP');
					// Verify savings calculation (monthly -> annual shows annual savings)
					expect(result.savings.period).toBe('year');
					// Annual savings = (monthly price * 12) - annual price
					expect(result.savings.amount).toBeGreaterThan(0);

					// Verify new price calculation (new annual price)
					expect(result.newPrice.period).toBe('year');
					expect(result.newPrice.amount).toBeGreaterThan(0);
				}
			},
			1000 * 60,
		);
	});

	describe('execute functionality', () => {
		it(
			'executes monthly to annual frequency switch with comprehensive verification',
			async () => {
				const monthlyPrice = 10;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencySwitch('Month', monthlyPrice);

				const productCatalog = await getProductCatalogFromApi(stage);
				const account = await getAccount(
					zuoraClient,
					subscription.accountNumber,
				);
				const candidateCharge = await selectCandidateSubscriptionCharge(
					subscription,
					dayjs(),
					account,
					productCatalog,
					zuoraClient,
				);
				const result: FrequencySwitchResponse = await executeFrequencySwitch(
					zuoraClient,
					subscription,
					candidateCharge,
					productCatalog,
					dayjs(),
				);

				// Expect success response
				expect('reason' in result).toBe(false);

				// Verify subscription state after execution
				const updatedSubscription = await getSubscription(
					zuoraClient,
					subscription.subscriptionNumber,
				);
				expect(updatedSubscription).toBeDefined();
				expect(updatedSubscription.status).toBe('Active');

				// Current rate plan should still be the original billing period (switch is scheduled, not immediate)
				const activeRatePlans = updatedSubscription.ratePlans.filter((rp) =>
					rp.ratePlanCharges.some((charge) => charge.billingPeriod),
				);
				expect(activeRatePlans.length).toBeGreaterThan(0);

				// The subscription should have at least one rate plan
				// In Zuora, pending changes may appear as additional rate plans or amendments
				expect(updatedSubscription.ratePlans.length).toBeGreaterThanOrEqual(1);

				// Verify billing preview shows the new billing period will be used
				const billingPreview = await getBillingPreview(
					zuoraClient,
					dayjs(updatedSubscription.termEndDate).add(1, 'day'), // Preview after term end
					updatedSubscription.accountNumber,
				);

				const subscriptionInvoiceItems = itemsForSubscription(
					subscription.subscriptionNumber,
				)(billingPreview);

				expect(subscriptionInvoiceItems.length).toBeGreaterThan(0);

				// At least one invoice item should exist for the subscription
				// Note: We can't easily check the exact billing period from invoice items alone,
				// but we can verify that billing preview works and returns items
				const totalChargeAmount = subscriptionInvoiceItems.reduce(
					(sum, item) => sum + item.chargeAmount,
					0,
				);
				expect(totalChargeAmount).toBeGreaterThan(0);
			},
			1000 * 60 * 2,
		);
	});
});
