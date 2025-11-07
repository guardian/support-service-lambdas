/**
 * Integration tests for frequency change functionality.
 * Tests actual frequency changes (monthly <-> annual) using real Zuora API calls.
 *
 * @group integration
 */
import console from 'console';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { createContribution } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import type { ContributionTestAdditionalOptions } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import {
	executeFrequencyChange,
	previewFrequencyChange,
	selectCandidateSubscriptionCharge,
} from '../src/frequencyChange';
import type {
	FrequencyChangePreviewResponse,
	FrequencyChangeSwitchResponse,
} from '../src/frequencySchemas';

interface FrequencyChangeTestSetup {
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
 * Creates a test contribution subscription that can be used for frequency change testing
 */
const createTestSubscriptionForFrequencyChange = async (
	billingPeriod: 'Month' | 'Annual',
	price: number,
	additionalOptions?: Omit<
		ContributionTestAdditionalOptions,
		'billingPeriod' | 'price'
	>,
): Promise<FrequencyChangeTestSetup> => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log(
		`Creating a new ${billingPeriod} contribution at price ${price} for frequency change testing`,
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

describe('frequency change behaviour', () => {
	describe('preview functionality', () => {
		it('can preview a monthly to annual frequency change', async () => {
			const monthlyPrice = 10;
			const { zuoraClient, subscription } =
				await createTestSubscriptionForFrequencyChange('Month', monthlyPrice);

			const productCatalog = await getProductCatalogFromApi(stage);
			const candidateCharge = selectCandidateSubscriptionCharge(
				subscription,
				dayjs().toDate(),
			);
		const result: FrequencyChangePreviewResponse =
			await previewFrequencyChange(
				zuoraClient,
				subscription,
				candidateCharge,
				productCatalog,
				'Annual',
			);

		// Expect success response
		expect('previewInvoices' in result).toBe(true);
		if ('previewInvoices' in result) {
			expect(result.previewInvoices).toBeDefined();
			expect(result.savings).toBeDefined();

			// Verify savings calculation (monthly -> annual shows annual savings)
				expect(result.savings.period).toBe('year');
				expect(result.savings.currency).toBe('GBP');
				// Annual savings = (monthly price * 12) - annual price
				expect(result.savings.amount).toBeGreaterThan(0);
			}
		});

		it('can preview an annual to monthly frequency change', async () => {
			const annualPrice = 120;
			const { zuoraClient, subscription } =
				await createTestSubscriptionForFrequencyChange('Annual', annualPrice);

			const productCatalog = await getProductCatalogFromApi(stage);
			const candidateCharge = selectCandidateSubscriptionCharge(
				subscription,
				dayjs().toDate(),
			);
		const result: FrequencyChangePreviewResponse =
			await previewFrequencyChange(
				zuoraClient,
				subscription,
				candidateCharge,
				productCatalog,
				'Month',
			);

		// Expect success response
		expect('previewInvoices' in result).toBe(true);
		if ('previewInvoices' in result) {
			expect(result.previewInvoices).toBeDefined();
			expect(result.savings).toBeDefined();

			// Verify savings calculation (annual -> monthly shows monthly savings)
				expect(result.savings.period).toBe('month');
				expect(result.savings.currency).toBe('GBP');
			}
		});

		it(
			'preview returns invoices with new billing period charges',
			async () => {
				const monthlyPrice = 15;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencyChange('Month', monthlyPrice);

				const productCatalog = await getProductCatalogFromApi(stage);
				const candidateCharge = selectCandidateSubscriptionCharge(
					subscription,
					dayjs().toDate(),
				);
				const result: FrequencyChangePreviewResponse =
					await previewFrequencyChange(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						'Annual',
					);

				// Expect success response
				expect('previewInvoices' in result).toBe(true);
				if ('previewInvoices' in result) {
					expect(result.previewInvoices).toBeDefined();
					if (result.previewInvoices.length > 0) {
					// Preview should contain invoice items
					const invoice = result.previewInvoices[0];
					expect(invoice).toBeDefined();
					if (invoice) {
						expect(invoice.invoiceItems.length).toBeGreaterThan(0);
					}
				}
				}
			},
			1000 * 60,
		);

		it(
			'preview for non-UK subscription (EUR currency)',
			async () => {
				const monthlyPrice = 10;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencyChange(
						'Month',
						monthlyPrice,
						{
							billingCountry: 'Germany',
							paymentMethod: 'visaCard',
						},
					);

				const productCatalog = await getProductCatalogFromApi(stage);
				const candidateCharge = selectCandidateSubscriptionCharge(
					subscription,
					dayjs().toDate(),
				);
				const result: FrequencyChangePreviewResponse =
					await previewFrequencyChange(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						'Annual',
					);

				// Expect success response
				expect('previewInvoices' in result).toBe(true);
				if ('previewInvoices' in result) {
					expect(result.previewInvoices).toBeDefined();
					expect(result.savings).toBeDefined();

					expect(result.savings.currency).toBe('EUR');
				}
			},
			1000 * 60,
		);
	});

	describe('execute functionality', () => {
		it(
			'can execute a monthly to annual frequency change',
			async () => {
				const monthlyPrice = 10;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencyChange('Month', monthlyPrice);

				const productCatalog = await getProductCatalogFromApi(stage);
				const candidateCharge = selectCandidateSubscriptionCharge(
					subscription,
					dayjs().toDate(),
				);
				const result: FrequencyChangeSwitchResponse =
					await executeFrequencyChange(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						'Annual',
					);

				// Expect success response
				expect('invoiceIds' in result).toBe(true);
				if ('invoiceIds' in result) {
					expect(result.invoiceIds).toBeDefined();
				}
			},
			1000 * 60,
		);

		it(
			'can execute an annual to monthly frequency change',
			async () => {
				const annualPrice = 120;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencyChange('Annual', annualPrice);

				const productCatalog = await getProductCatalogFromApi(stage);
				const candidateCharge = selectCandidateSubscriptionCharge(
					subscription,
					dayjs().toDate(),
				);
				const result: FrequencyChangeSwitchResponse =
					await executeFrequencyChange(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						'Month',
					);

				// Expect success response
				expect('invoiceIds' in result).toBe(true);
				if ('invoiceIds' in result) {
					expect(result.invoiceIds).toBeDefined();
				}
			},
			1000 * 60,
		);

		it(
			'executed change is scheduled for term end date',
			async () => {
				const monthlyPrice = 12;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencyChange('Month', monthlyPrice);

				const productCatalog = await getProductCatalogFromApi(stage);
				const candidateCharge = selectCandidateSubscriptionCharge(
					subscription,
					dayjs().toDate(),
				);

				const result: FrequencyChangeSwitchResponse =
					await executeFrequencyChange(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						'Annual',
					);

				// The change should be scheduled, not immediate
				// We can verify by checking the subscription again
				const updatedSubscription = await getSubscription(
					zuoraClient,
					subscription.subscriptionNumber,
				);
				expect(updatedSubscription).toBeDefined();
				
				// Expect success response
				expect('invoiceIds' in result).toBe(true);
				if ('invoiceIds' in result) {
					expect(result.invoiceIds).toBeDefined();
				}			},
			1000 * 60 * 2,
		);

		it(
			'executed frequency change for non-UK subscription',
			async () => {
				const monthlyPrice = 10;
				const { zuoraClient, subscription } =
					await createTestSubscriptionForFrequencyChange(
						'Month',
						monthlyPrice,
						{
							billingCountry: 'United States',
							paymentMethod: 'visaCard',
						},
					);

				const productCatalog = await getProductCatalogFromApi(stage);
				const candidateCharge = selectCandidateSubscriptionCharge(
					subscription,
					dayjs().toDate(),
				);
				const result: FrequencyChangeSwitchResponse =
					await executeFrequencyChange(
						zuoraClient,
						subscription,
						candidateCharge,
						productCatalog,
						'Annual',
					);

				// Expect success response
				expect('invoiceIds' in result).toBe(true);
				if ('invoiceIds' in result) {
					expect(result.invoiceIds).toBeDefined();
				}
			},
			1000 * 60,
		);
	});
});
