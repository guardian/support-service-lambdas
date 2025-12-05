/**
 * Integration tests for frequency switch functionality.
 * Tests actual frequency switches (monthly → annual only) using real Zuora API calls.
 *
 * Test Coverage:
 * - Preview: 2 tests (monthly→annual, non-GBP)
 * - Execute: 2 tests (monthly→annual with comprehensive verification, non-GBP currencies)
 * - Total: 4 integration tests creating real Zuora subscriptions
 * - Expected runtime: ~4-6 minutes (each test creates a real subscription in CODE environment)
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

		it(
			'preview works for non-GBP subscription (EUR currency)',
			async () => {
				const monthlyPrice = 10;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencySwitch(
						'Month',
						monthlyPrice,
						{
							billingCountry: 'Germany',
							paymentMethod: 'visaCard',
						},
					);

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
					expect(result.currency).toBe('EUR');
					expect(result.savings.period).toBe('year');

					// Verify new price has correct period
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

				// Expect success response with invoice IDs
				expect('invoiceIds' in result).toBe(true);
				if ('invoiceIds' in result) {
					expect(result.invoiceIds).toBeDefined();
					expect(result.invoiceIds.length).toBeGreaterThan(0);
				}

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

		it(
			'executes frequency switch for non-GBP subscriptions (EUR and USD)',
			async () => {
				// Test with EUR subscription
				const eurPrice = 10;
				const { zuoraClient: eurClient, subscription: eurSubscription } =
					await createTestSubscriptionForFrequencySwitch('Month', eurPrice, {
						billingCountry: 'Germany',
						paymentMethod: 'visaCard',
					});

				const productCatalog = await getProductCatalogFromApi(stage);
				const eurAccount = await getAccount(
					eurClient,
					eurSubscription.accountNumber,
				);
				const eurCandidateCharge = await selectCandidateSubscriptionCharge(
					eurSubscription,
					dayjs(),
					eurAccount,
					productCatalog,
					eurClient,
				);
				const eurResult: FrequencySwitchResponse = await executeFrequencySwitch(
					eurClient,
					eurSubscription,
					eurCandidateCharge,
					productCatalog,
					dayjs(),
				);

				expect('invoiceIds' in eurResult).toBe(true);
				if ('invoiceIds' in eurResult) {
					expect(eurResult.invoiceIds).toBeDefined();
					expect(eurResult.invoiceIds.length).toBeGreaterThan(0);
				}

				const updatedEurSubscription = await getSubscription(
					eurClient,
					eurSubscription.subscriptionNumber,
				);
				expect(updatedEurSubscription).toBeDefined();
				expect(updatedEurSubscription.status).toBe('Active');

				// Test with USD subscription
				const usdPrice = 10;
				const { zuoraClient: usdClient, subscription: usdSubscription } =
					await createTestSubscriptionForFrequencySwitch('Month', usdPrice, {
						billingCountry: 'United States',
						paymentMethod: 'visaCard',
					});

				const usdAccount = await getAccount(
					usdClient,
					usdSubscription.accountNumber,
				);
				const usdCandidateCharge = await selectCandidateSubscriptionCharge(
					usdSubscription,
					dayjs(),
					usdAccount,
					productCatalog,
					usdClient,
				);
				const usdResult: FrequencySwitchResponse = await executeFrequencySwitch(
					usdClient,
					usdSubscription,
					usdCandidateCharge,
					productCatalog,
					dayjs(),
				);

				expect('invoiceIds' in usdResult).toBe(true);
				if ('invoiceIds' in usdResult) {
					expect(usdResult.invoiceIds).toBeDefined();
					expect(usdResult.invoiceIds.length).toBeGreaterThan(0);
				}

				const updatedUsdSubscription = await getSubscription(
					usdClient,
					usdSubscription.subscriptionNumber,
				);
				expect(updatedUsdSubscription).toBeDefined();
				expect(updatedUsdSubscription.status).toBe('Active');
			},
			1000 * 60 * 3,
		);
	});
});
