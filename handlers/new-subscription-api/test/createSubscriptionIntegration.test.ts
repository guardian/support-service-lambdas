/**
 * Integration tests for the new-subscription-api endpoint.
 * These tests make real API calls to Zuora in the CODE environment.
 * Run with: pnpm it-test
 *
 * Prerequisites: AWS credentials configured with access to CODE environment.
 *
 * @group integration
 */
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import {
	buildCreateSubscriptionRequest,
	createSubscription,
} from '@modules/zuora/createSubscription/createSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

const stage: Stage = 'CODE';

describe('new-subscription-api integration tests', () => {
	it('creates a SupporterPlus Monthly subscription via the Orders API', async () => {
		const zuoraClient = await ZuoraClient.create(stage);
		const productCatalog = await getProductCatalogFromApi(stage);

		const testRequestId = `test-${Date.now()}-${Math.random()
			.toString(36)
			.substring(2, 10)}`;

		console.log(
			`Creating SupporterPlus Monthly subscription with request ID: ${testRequestId}`,
		);

		const result = await createSubscription(
			zuoraClient,
			productCatalog,
			{
				accountName: 'New Subscription API Integration Test',
				createdRequestId: testRequestId,
				salesforceAccountId: '0039E00000Ks6EAQAV',
				salesforceContactId: '0039E00000Ks6EAQAV',
				identityId: '200004836',
				currency: 'GBP',
				paymentGateway: 'Stripe PaymentIntents GNM Membership',
				paymentMethod: {
					type: 'CreditCardReferenceTransaction',
					tokenId: 'pm_card_visa',
					secondTokenId: 'cus_test_12345',
					cardNumber: '424242424242',
					cardType: 'Visa',
					expirationMonth: 12,
					expirationYear: 2099,
				},
				billToContact: {
					firstName: 'Integration',
					lastName: 'Test',
					workEmail: 'integration.test@theguardian.com',
					country: 'GB',
				},
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 10,
				},
				runBilling: false,
				collectPayment: false,
			},
			undefined,
		);

		console.log('Subscription created successfully:', {
			orderNumber: result.orderNumber,
			accountNumber: result.accountNumber,
			subscriptionNumbers: result.subscriptionNumbers,
		});

		expect(result.orderNumber).toBeTruthy();
		expect(result.accountNumber).toBeTruthy();
		expect(result.subscriptionNumbers).toHaveLength(1);
		expect(result.subscriptionNumbers[0]).toMatch(/^A-S/);
	}, 60000);

	it('fetches product catalog from the API', async () => {
		console.log('Fetching product catalog from CODE environment');
		const productCatalog = await getProductCatalogFromApi(stage);

		expect(productCatalog).toBeTruthy();
		expect(productCatalog.SupporterPlus).toBeTruthy();
		console.log('Product catalog fetched successfully', {
			products: Object.keys(productCatalog),
		});
	}, 30000);

	it('builds a valid create subscription request for SupporterPlus Annual', async () => {
		const productCatalog = await getProductCatalogFromApi(stage);

		const request = buildCreateSubscriptionRequest(
			productCatalog,
			{
				accountName: 'New Subscription API Integration Test',
				createdRequestId: `test-${Date.now()}`,
				salesforceAccountId: '0039E00000Ks6EAQAV',
				salesforceContactId: '0039E00000Ks6EAQAV',
				identityId: '200004836',
				currency: 'GBP',
				paymentGateway: 'Stripe PaymentIntents GNM Membership',
				paymentMethod: {
					type: 'CreditCardReferenceTransaction',
					tokenId: 'pm_card_visa',
					secondTokenId: 'cus_test_12345',
					cardNumber: '424242424242',
					cardType: 'Visa',
					expirationMonth: 12,
					expirationYear: 2099,
				},
				billToContact: {
					firstName: 'Integration',
					lastName: 'Test',
					workEmail: 'integration.test@theguardian.com',
					country: 'GB',
				},
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Annual',
					amount: 120,
				},
			},
			undefined,
		);

		console.log('Create subscription request built successfully', {
			subscriptionCount: request.subscriptions.length,
			processingOptions: request.processingOptions,
		});

		expect(request.subscriptions).toHaveLength(1);
		expect(request.processingOptions.runBilling).toBe(true);
		expect(request.processingOptions.collectPayment).toBe(true);
	}, 30000);
});
