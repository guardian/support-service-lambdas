/**
 * Integration tests for the new-subscription-api endpoint.
 * These tests make real API calls to Zuora in the CODE environment.
 * Run with: pnpm it-test
 *
 * Prerequisites: AWS credentials configured with access to CODE environment.
 *
 * @group integration
 */
import { SupportRegionId } from '@modules/internationalisation/countryGroup';
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
				salesforceAccountId: '0013E00001AU6xcQAD',
				salesforceContactId: '0033E00001Cq8D2QAJ',
				identityId: '9999999',
				currency: 'GBP',
				paymentGateway: 'Stripe PaymentIntents GNM Membership',
				existingPaymentMethod: {
					// Payment method from account A00078074 in CODE
					id: '2c92c0f87568d97201756b1578b6069c',
					requiresCloning: true,
				},
				appliedPromotion: {
					promoCode: 'E2E_TEST_SPLUS_MONTHLY',
					supportRegionId: SupportRegionId.UK,
				},
				billToContact: {
					firstName: 'Integration',
					lastName: 'Test',
					workEmail: 'integration.test@theguardian.com',
					country: 'GB',
					address1: '90 York Way',
					city: 'London',
					postalCode: 'N1 9GU',
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
