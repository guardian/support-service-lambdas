import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
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
	productPurchase: { product: 'GuardianAdLite' as const, ratePlan: 'Monthly' as const },
};

const orderResponse = {
	orderNumber: 'ORD-001',
	accountNumber: 'A00099999',
	subscriptionNumbers: ['A-S00099999'],
};

const ccrtPaymentMethodById = {
	id: 'pm-ccrt-id',
	type: 'CreditCardReferenceTransaction',
	tokenId: 'tok_stripe_123',
	secondTokenId: 'cus_stripe_456',
};

const bankTransferPaymentMethodById = {
	id: 'pm-bt-id',
	type: 'Bacs',
	bankTransferType: 'BACS',
	accountNumber: '****6819',
	bankCode: '601613',
	branchCode: null,
	IBAN: 'GB29NWBK60161331926819',
	accountHolderInfo: { accountHolderName: 'John Doe' },
	mandateInfo: {
		mandateId: 'GC-MANDATE-001',
		mandateReason: null,
		mandateStatus: null,
	},
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
					existingPaymentMethod: { id: 'pm-existing-id', requiresCloning: false },
				},
				undefined,
			);

			expect(mockPost).toHaveBeenCalledTimes(1);
			const [path, body] = mockPost.mock.calls[0] as [string, string];
			expect(path).toBe('/v1/orders');
			const parsed = JSON.parse(body) as {
				newAccount: { hpmCreditCardPaymentMethodId?: string; paymentMethod?: unknown; autoPay: boolean };
				processingOptions: { runBilling: boolean; collectPayment: boolean };
			};
			expect(parsed.newAccount.hpmCreditCardPaymentMethodId).toBe('pm-existing-id');
			expect(parsed.newAccount.paymentMethod).toBeUndefined();
			expect(parsed.newAccount.autoPay).toBe(true);
			expect(parsed.processingOptions.runBilling).toBe(true);
			expect(parsed.processingOptions.collectPayment).toBe(true);
		});

		it('does not call updateAccount', async () => {
			const mockGet = jest.fn();
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const mockPut = jest.fn();
			const client = buildMockZuoraClient(mockGet, mockPost, mockPut);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: { id: 'pm-existing-id', requiresCloning: false },
				},
				undefined,
			);

			expect(mockPut).not.toHaveBeenCalled();
		});

		it('does not call generateBillingDocuments separately', async () => {
			const mockGet = jest.fn();
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const client = buildMockZuoraClient(mockGet, mockPost);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: { id: 'pm-existing-id', requiresCloning: false },
				},
				undefined,
			);

			const postPaths = (mockPost.mock.calls as Array<[string, ...unknown[]]>).map(([p]) => p);
			expect(postPaths).not.toContain('/v1/accounts/A00099999/billing-documents/generate');
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
					existingPaymentMethod: { id: 'pm-existing-id', requiresCloning: false },
					runBilling: false,
					collectPayment: false,
				},
				undefined,
			);

			const [, body] = mockPost.mock.calls[0] as [string, string];
			const parsed = JSON.parse(body) as {
				processingOptions: { runBilling: boolean; collectPayment: boolean };
			};
			expect(parsed.processingOptions.runBilling).toBe(false);
			expect(parsed.processingOptions.collectPayment).toBe(false);
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
			expect(getPath).toBe('/v1/payment-methods/pm-ccrt-id');

			const [postPath, postBody] = mockPost.mock.calls[0] as [string, string];
			expect(postPath).toBe('/v1/orders');
			const parsed = JSON.parse(postBody) as {
				newAccount: { paymentMethod: Record<string, unknown>; autoPay: boolean };
				processingOptions: { runBilling: boolean; collectPayment: boolean };
			};
			expect(parsed.newAccount.paymentMethod.type).toBe(
				'CreditCardReferenceTransaction',
			);
			expect(parsed.newAccount.paymentMethod.tokenId).toBe('tok_stripe_123');
			expect(parsed.newAccount.paymentMethod.secondTokenId).toBe('cus_stripe_456');
			expect(parsed.newAccount.autoPay).toBe(true);
			expect(parsed.processingOptions.runBilling).toBe(true);
			expect(result.accountNumber).toBe('A00099999');
		});

		it('uses two-step flow for BankTransfer: creates orphan PM then assigns via hpmCreditCardPaymentMethodId', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(bankTransferPaymentMethodById);
			const mockPost = jest
				.fn()
				.mockResolvedValueOnce({ id: 'new-pm-id' }) // POST /v1/payment-methods (orphan)
				.mockResolvedValueOnce(orderResponse);       // POST /v1/orders
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

			// Step 1: POST /v1/payment-methods with no accountKey (orphan PM)
			const [pmPath, pmBody] = mockPost.mock.calls[0] as [string, string];
			expect(pmPath).toBe('/v1/payment-methods');
			const pm = JSON.parse(pmBody) as Record<string, unknown>;
			expect(pm.accountKey).toBeUndefined();
			expect(pm.type).toBe('Bacs');
			expect((pm.mandateInfo as Record<string, string>).mandateId).toBe(
				'GC-MANDATE-001',
			);

			// Step 2: POST /v1/orders with hpmCreditCardPaymentMethodId, autoPay:true
			const [ordersPath, ordersBody] = mockPost.mock.calls[1] as [string, string];
			expect(ordersPath).toBe('/v1/orders');
			const ordersRequest = JSON.parse(ordersBody) as {
				newAccount: { hpmCreditCardPaymentMethodId: string; paymentMethod?: unknown; autoPay: boolean };
				processingOptions: { runBilling: boolean; collectPayment: boolean };
			};
			expect(ordersRequest.newAccount.hpmCreditCardPaymentMethodId).toBe('new-pm-id');
			expect(ordersRequest.newAccount.paymentMethod).toBeUndefined();
			expect(ordersRequest.newAccount.autoPay).toBe(true);
			expect(ordersRequest.processingOptions.runBilling).toBe(true);
			expect(ordersRequest.processingOptions.collectPayment).toBe(true);

			// No PUT (no separate updateAccount call)
			expect(mockPut).not.toHaveBeenCalled();

			expect(mockPost).toHaveBeenCalledTimes(2);
			expect(result.accountNumber).toBe('A00099999');
		});

		it('passes createdRequestId as idempotency key', async () => {
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

		it('includes promotion custom fields when appliedPromotion is provided', async () => {
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
						productCatalog.DigitalSubscription.ratePlans.Monthly.id,
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
					productPurchase: { product: 'DigitalSubscription', ratePlan: 'Monthly' },
					existingPaymentMethod: { id: 'pm-ccrt-id', requiresCloning: true },
				appliedPromotion: { promoCode: 'PROMO25', supportRegionId: SupportRegionId.UK },
				},
				promotion,
			);

			const [, postBody] = mockPost.mock.calls[0] as [string, string];
			const parsed = JSON.parse(postBody) as {
				subscriptions: Array<{
					customFields: Record<string, unknown>;
				}>;
			};
			const customFields = parsed.subscriptions[0]!.customFields;
			expect(customFields.PromotionCode__c).toBe('PROMO25');
			expect(customFields.InitialPromotionCode__c).toBe('PROMO25');
		});
	});
});
