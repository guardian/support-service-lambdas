/**
 * Integration tests for the new-subscription-api endpoint.
 * These tests make real API calls to Zuora in the CODE environment.
 * Run with: pnpm it-test
 *
 * Prerequisites: AWS credentials configured with access to CODE environment.
 *
 * @group integration
 */
import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createNewSubscriptionEndpoint } from '../src/createSubscriptionEndpoint';
import { createSubscriptionResponseSchema } from '../src/responseSchema';

const stage: Stage = 'CODE';

describe('new-subscription-api integration tests', () => {
	it('creates a SupporterPlus Monthly subscription via the Orders API', async () => {
		const zuoraClient = await ZuoraClient.create(stage);
		const testRequestId = crypto.randomUUID();

		const apiGatewayResult = await createNewSubscriptionEndpoint(
			stage,
			zuoraClient,
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
					amount: 12,
				},
			},
		);

		expect(apiGatewayResult.statusCode).toBe(200);

		const result = createSubscriptionResponseSchema.parse(
			JSON.parse(apiGatewayResult.body),
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
});
