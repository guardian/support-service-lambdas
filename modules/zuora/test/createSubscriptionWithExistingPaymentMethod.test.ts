import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

const buildMockZuoraClient = (
	mockGet: jest.Mock,
	mockPost: jest.Mock,
	mockPut?: jest.Mock,
): jest.Mocked<ZuoraClient> =>
	({
		get: mockGet,
		post: mockPost,
		put: mockPut ?? jest.fn(),
		delete: jest.fn(),
		fetch: jest.fn(),
	}) as unknown as jest.Mocked<ZuoraClient>;

const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));

const baseInput = {
	accountName: 'Test Account',
	createdRequestId: 'test-request-id',
	salesforceAccountId: 'sf-account-id',
	salesforceContactId: 'sf-contact-id',
	identityId: 'identity-id-123',
	currency: 'GBP' as const,
	paymentGateway: 'Stripe PaymentIntents GNM Membership' as const,
	billToContact: {
		firstName: 'John',
		lastName: 'Doe',
		workEmail: 'john@example.com',
		country: 'GB',
	},
	productPurchase: {
		product: 'GuardianAdLite' as const,
		ratePlan: 'Monthly' as const,
	},
};

const orderResponse = {
	orderNumber: 'ORD-001',
	accountNumber: 'A00099999',
	subscriptionNumbers: ['A-S00099999'],
};

const ccrtPaymentMethodById = {
	Id: 'pm-ccrt-id',
	Type: 'CreditCardReferenceTransaction',
	Country: 'GB',
	TokenId: 'tok_stripe_123',
	SecondTokenId: 'cus_stripe_456',
};

const bankTransferPaymentMethodById = {
	Id: 'pm-bt-id',
	Type: 'BankTransfer',
	Country: 'GB',
	BankTransferType: 'BACS',
	BankTransferAccountNumberMask: '****6819',
	BankCode: '601613',
	BankTransferAccountName: 'John Doe',
	MandateID: 'GC-MANDATE-001',
};

describe('createSubscriptionWithExistingPaymentMethod', () => {
	describe('requiresCloning: false', () => {
		it('creates account with hpmCreditCardPaymentMethodId, autoPay:true, runBilling+collectPayment in a single call', async () => {
			const mockGet = jest.fn();
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const mockPut = jest.fn();
			const client = buildMockZuoraClient(mockGet, mockPost, mockPut);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: {
						id: 'pm-existing-id',
						requiresCloning: false,
					},
				},
				undefined,
			);

			expect(mockPost).toHaveBeenCalledTimes(1);
			const [path, body] = mockPost.mock.calls[0] as [string, string];
			expect(path).toBe('/v1/orders');

			expect(JSON.parse(body)).toMatchObject({
				newAccount: {
					hpmCreditCardPaymentMethodId: 'pm-existing-id',
					autoPay: true,
				},
				processingOptions: { runBilling: true, collectPayment: true },
			});
		});

		it('sets runBilling:false and collectPayment:false in processingOptions when runBilling is false', async () => {
			const mockGet = jest.fn();
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const client = buildMockZuoraClient(mockGet, mockPost);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: {
						id: 'pm-existing-id',
						requiresCloning: false,
					},
					runBilling: false,
					collectPayment: false,
				},
				undefined,
			);

			const [, body] = mockPost.mock.calls[0] as [string, string];
			expect(JSON.parse(body)).toMatchObject({
				processingOptions: { runBilling: false, collectPayment: false },
			});
		});
	});

	describe('requiresCloning: true', () => {
		it('fetches PM by ID and embeds CCRT inline in Orders API', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(ccrtPaymentMethodById);
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const client = buildMockZuoraClient(mockGet, mockPost);

			const result = await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: { id: 'pm-ccrt-id', requiresCloning: true },
				},
				undefined,
			);

			const [getPath] = mockGet.mock.calls[0] as [string];
			expect(getPath).toBe('/v1/object/payment-method/pm-ccrt-id');

			const [postPath, postBody] = mockPost.mock.calls[0] as [string, string];
			expect(postPath).toBe('/v1/orders');

			expect(JSON.parse(postBody)).toMatchObject({
				newAccount: {
					paymentMethod: {
						type: 'CreditCardReferenceTransaction',
						tokenId: 'tok_stripe_123',
						secondTokenId: 'cus_stripe_456',
					},
					autoPay: true,
				},
				processingOptions: { runBilling: true },
			});
			expect(result.accountNumber).toBe('A00099999');
		});

		it('uses two-step flow for BankTransfer: creates orphan PM then assigns via hpmCreditCardPaymentMethodId', async () => {
			const mockGet = jest
				.fn()
				.mockResolvedValueOnce(bankTransferPaymentMethodById);
			const mockPost = jest
				.fn()
				.mockResolvedValueOnce({ Id: 'new-pm-id' }) // POST /v1/object/payment-method (orphan)
				.mockResolvedValueOnce(orderResponse); // POST /v1/orders
			const mockPut = jest.fn();
			const client = buildMockZuoraClient(mockGet, mockPost, mockPut);

			const result = await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					paymentGateway: 'GoCardless' as const,
					existingPaymentMethod: { id: 'pm-bt-id', requiresCloning: true },
				},
				undefined,
			);

			// Step 1: POST /v1/object/payment-method with no accountKey (orphan PM)
			const [pmPath, pmBody] = mockPost.mock.calls[0] as [string, string];
			expect(pmPath).toBe('/v1/object/payment-method');
			const pm = JSON.parse(pmBody) as Record<string, unknown>;
			expect(pm).toMatchObject({
				Type: 'BankTransfer',
				MandateID: 'GC-MANDATE-001',
			});
			expect(pm.AccountKey).toBeUndefined();

			// Step 2: POST /v1/orders with hpmCreditCardPaymentMethodId, autoPay:true
			const [ordersPath, ordersBody] = mockPost.mock.calls[1] as [
				string,
				string,
			];
			expect(ordersPath).toBe('/v1/orders');
			expect(JSON.parse(ordersBody)).toMatchObject({
				newAccount: {
					hpmCreditCardPaymentMethodId: 'new-pm-id',
					autoPay: true,
				},
				processingOptions: { runBilling: true, collectPayment: true },
			});

			expect(mockPost).toHaveBeenCalledTimes(2);
			expect(result.accountNumber).toBe('A00099999');
		});

		it('passes createdRequestId as idempotency key to the order call', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(ccrtPaymentMethodById);
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const client = buildMockZuoraClient(mockGet, mockPost);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					createdRequestId: 'MY-IDEMPOTENCY-KEY',
					existingPaymentMethod: { id: 'pm-ccrt-id', requiresCloning: true },
				},
				undefined,
			);

			const [, , , headers] = mockPost.mock.calls[0] as [
				string,
				string,
				unknown,
				Record<string, string> | undefined,
			];
			expect(headers).toEqual({ 'idempotency-key': 'MY-IDEMPOTENCY-KEY' });
		});

		it('sets all custom fields on the account, subscription and soldToContact', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(ccrtPaymentMethodById);
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const client = buildMockZuoraClient(mockGet, mockPost);

			const promotion: Promo = {
				name: 'Test Promo',
				campaignCode: 'campaign',
				discount: { amount: 10, durationMonths: 3 },
				appliesTo: {
					countries: ['GB'],
					productRatePlanIds: [
						productCatalog.NationalDelivery.ratePlans.Everyday.id,
					],
				},
				promoCode: 'PROMO25',
				startTimestamp: '2020-01-01',
				endTimestamp: '2099-01-01',
			};

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					createdRequestId: 'test-request-id-123',
					salesforceAccountId: 'sf-account-id-456',
					salesforceContactId: 'sf-contact-id-789',
					identityId: 'identity-id-abc',
					acquisitionCase: 'case-001',
					acquisitionSource: 'CSR',
					createdByCSR: 'John Smith',
					existingPaymentMethod: { id: 'pm-ccrt-id', requiresCloning: true },
					appliedPromotion: {
						promoCode: 'PROMO25',
						supportRegionId: SupportRegionId.UK,
					},
					productPurchase: {
						product: 'NationalDelivery',
						ratePlan: 'Everyday',
						firstDeliveryDate: new Date('2026-05-01'),
						deliveryAgent: 42,
						deliveryInstructions: 'Leave with concierge',
						deliveryContact: {
							firstName: 'Jane',
							lastName: 'Smith',
							workEmail: 'jane@example.com',
							country: 'GB',
							address1: '1 Test Street',
							city: 'London',
							postalCode: 'N1 9GU',
						},
					},
				},
				promotion,
			);

			const [, postBody] = mockPost.mock.calls[0] as [string, string];
			const parsed = JSON.parse(postBody) as {
				newAccount: {
					customFields: Record<string, unknown>;
					soldToContact: Record<string, unknown>;
				};
				subscriptions: Array<{ customFields: Record<string, unknown> }>;
			};

			expect(parsed.newAccount.customFields).toMatchObject({
				sfContactId__c: 'sf-contact-id-789',
				IdentityId__c: 'identity-id-abc',
				CreatedRequestId__c: 'test-request-id-123',
			});

			expect(parsed.subscriptions[0]?.customFields).toMatchObject({
				DeliveryAgent__c: '42',
				CreatedRequestId__c: 'test-request-id-123',
				AcquisitionCase__c: 'case-001',
				AcquisitionSource__c: 'CSR',
				CreatedByCSR__c: 'John Smith',
				LastPlanAddedDate__c: zuoraDateFormat(dayjs()),
				PromotionCode__c: 'PROMO25',
				InitialPromotionCode__c: 'PROMO25',
			});

			expect(parsed.newAccount.soldToContact).toMatchObject({
				SpecialDeliveryInstructions__c: 'Leave with concierge',
				firstName: 'Jane',
				address1: '1 Test Street',
			});
		});
	});
});
