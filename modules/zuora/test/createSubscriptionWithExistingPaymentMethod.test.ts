import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscription';
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
	paymentGateway: 'Stripe PaymentIntents GNM Membership',
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

const paypalPaymentMethodById = {
	id: 'pm-pp-id',
	type: 'PayPalNativeEC',
	BAID: 'BAID-paypal-123',
	email: 'john@example.com',
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

const creditCardPaymentMethodById = {
	id: 'pm-cc-id',
	type: 'CreditCard',
};

describe('createSubscriptionWithExistingPaymentMethod', () => {
	describe('requiresCloning: false', () => {
		it('creates account via Orders API without paymentMethod, autoPay:false, runBilling:false', async () => {
			const mockGet = jest.fn();
			const mockPost = jest
				.fn()
				.mockResolvedValueOnce(orderResponse)
				.mockResolvedValueOnce({}); // billing-documents/generate
			const mockPut = jest.fn().mockResolvedValueOnce(undefined);
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

			const [path, body] = mockPost.mock.calls[0] as [string, string];
			expect(path).toBe('/v1/orders');
			const parsed = JSON.parse(body) as {
				newAccount: { paymentMethod?: unknown; autoPay: boolean };
				processingOptions: { runBilling: boolean; collectPayment: boolean };
			};
			expect(parsed.newAccount.paymentMethod).toBeUndefined();
			expect(parsed.newAccount.autoPay).toBe(false);
			expect(parsed.processingOptions.runBilling).toBe(false);
			expect(parsed.processingOptions.collectPayment).toBe(false);
		});

		it('calls updateAccount with defaultPaymentMethodId and autoPay:true', async () => {
			const mockGet = jest.fn();
			const mockPost = jest
				.fn()
				.mockResolvedValueOnce(orderResponse)
				.mockResolvedValueOnce({});
			const mockPut = jest.fn().mockResolvedValueOnce(undefined);
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

			const [putPath, putBody] = mockPut.mock.calls[0] as [string, string];
			expect(putPath).toBe('/v1/accounts/A00099999');
			const putPayload = JSON.parse(putBody) as Record<string, unknown>;
			expect(putPayload.defaultPaymentMethodId).toBe('pm-existing-id');
			expect(putPayload.autoPay).toBe(true);
		});

		it('calls generateBillingDocuments (runBilling defaults to true)', async () => {
			const mockGet = jest.fn();
			const mockPost = jest
				.fn()
				.mockResolvedValueOnce(orderResponse)
				.mockResolvedValueOnce({});
			const mockPut = jest.fn().mockResolvedValueOnce(undefined);
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

			const [billPath, billBody] = mockPost.mock.calls[1] as [string, string];
			expect(billPath).toBe('/v1/accounts/A00099999/billing-documents/generate');
			const billPayload = JSON.parse(billBody) as Record<string, unknown>;
			expect(billPayload.targetDate).toBeDefined();
			expect(billPayload.effectiveDate).toBeDefined();
		});

		it('does not call generateBillingDocuments when runBilling is false', async () => {
			const mockGet = jest.fn();
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const mockPut = jest.fn().mockResolvedValueOnce(undefined);
			const client = buildMockZuoraClient(mockGet, mockPost, mockPut);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: { id: 'pm-existing-id', requiresCloning: false },
					runBilling: false,
				},
				undefined,
			);

			const postPaths = (mockPost.mock.calls as Array<[string, ...unknown[]]>).map(
				([p]) => p,
			);
			expect(postPaths).not.toContain(
				'/v1/accounts/A00099999/billing-documents/generate',
			);
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

		it('fetches PM by ID and embeds PayPal inline in Orders API', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(paypalPaymentMethodById);
			const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
			const client = buildMockZuoraClient(mockGet, mockPost);

			await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					existingPaymentMethod: { id: 'pm-pp-id', requiresCloning: true },
				},
				undefined,
			);

			const [, postBody] = mockPost.mock.calls[0] as [string, string];
			const parsed = JSON.parse(postBody) as {
				newAccount: { paymentMethod: Record<string, unknown> };
			};
			expect(parsed.newAccount.paymentMethod.type).toBe('PayPalNativeEC');
			expect(parsed.newAccount.paymentMethod.BAID).toBe('BAID-paypal-123');
			expect(parsed.newAccount.paymentMethod.email).toBe('john@example.com');
		});

		it('uses two-step flow for BankTransfer: clones PM, updates account, generates billing docs', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(bankTransferPaymentMethodById);
			const mockPost = jest
				.fn()
				.mockResolvedValueOnce(orderResponse) // POST /v1/orders
				.mockResolvedValueOnce({ id: 'new-pm-id' }) // POST /v1/payment-methods
				.mockResolvedValueOnce({}); // POST billing-documents/generate
			const mockPut = jest.fn().mockResolvedValueOnce(undefined);
			const client = buildMockZuoraClient(mockGet, mockPost, mockPut);

			const result = await createSubscriptionWithExistingPaymentMethod(
				client,
				productCatalog,
				{
					...baseInput,
					paymentGateway: 'GoCardless',
					existingPaymentMethod: { id: 'pm-bt-id', requiresCloning: true },
				},
				undefined,
			);

			// Step 1: Orders API without paymentMethod, autoPay:false
			const [ordersPath, ordersBody] = mockPost.mock.calls[0] as [string, string];
			expect(ordersPath).toBe('/v1/orders');
			const ordersRequest = JSON.parse(ordersBody) as {
				newAccount: { paymentMethod?: unknown; autoPay: boolean };
				processingOptions: { runBilling: boolean; collectPayment: boolean };
			};
			expect(ordersRequest.newAccount.paymentMethod).toBeUndefined();
			expect(ordersRequest.newAccount.autoPay).toBe(false);
			expect(ordersRequest.processingOptions.runBilling).toBe(false);

			// Step 2: POST /v1/payment-methods with BankTransfer details
			const [pmPath, pmBody] = mockPost.mock.calls[1] as [string, string];
			expect(pmPath).toBe('/v1/payment-methods');
			const pm = JSON.parse(pmBody) as Record<string, unknown>;
			expect(pm.accountKey).toBe('A00099999');
			expect(pm.type).toBe('Bacs');
			expect((pm.mandateInfo as Record<string, string>).mandateId).toBe(
				'GC-MANDATE-001',
			);

			// Step 3: PUT /v1/accounts to set default PM and restore autoPay
			const [putPath, putBody] = mockPut.mock.calls[0] as [string, string];
			expect(putPath).toBe('/v1/accounts/A00099999');
			const putPayload = JSON.parse(putBody) as Record<string, unknown>;
			expect(putPayload.defaultPaymentMethodId).toBe('new-pm-id');
			expect(putPayload.autoPay).toBe(true);

			// Step 4: billing-documents/generate
			const [billPath] = mockPost.mock.calls[2] as [string];
			expect(billPath).toBe('/v1/accounts/A00099999/billing-documents/generate');

			expect(result.accountNumber).toBe('A00099999');
		});

		it('throws for CreditCard payment method', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(creditCardPaymentMethodById);
			const mockPost = jest.fn();
			const client = buildMockZuoraClient(mockGet, mockPost);

			await expect(
				createSubscriptionWithExistingPaymentMethod(
					client,
					productCatalog,
					{
						...baseInput,
						existingPaymentMethod: { id: 'pm-cc-id', requiresCloning: true },
					},
					undefined,
				),
			).rejects.toThrow(
				'CreditCard payment method is not supported for cloning',
			);
		});

		it('throws for unknown payment method type', async () => {
			const mockGet = jest
				.fn()
				.mockResolvedValueOnce({ id: 'pm-unknown-id', type: 'SomeUnknownType' });
			const mockPost = jest.fn();
			const client = buildMockZuoraClient(mockGet, mockPost);

			await expect(
				createSubscriptionWithExistingPaymentMethod(
					client,
					productCatalog,
					{
						...baseInput,
						existingPaymentMethod: { id: 'pm-unknown-id', requiresCloning: true },
					},
					undefined,
				),
			).rejects.toThrow('Unsupported payment method type for cloning');
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
