import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { cloneAccountWithSubscription } from '@modules/zuora/createSubscription/cloneAccountWithSubscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

const buildMockZuoraClient = (
	mockGet: jest.Mock,
	mockPost: jest.Mock,
): jest.Mocked<ZuoraClient> =>
	({
		get: mockGet,
		post: mockPost,
		put: jest.fn(),
		delete: jest.fn(),
		fetch: jest.fn(),
	}) as unknown as jest.Mocked<ZuoraClient>;

const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));

const baseSourceAccount = {
	basicInfo: {
		id: 'account-hex-id-123',
		name: 'Test Account',
		crmId: 'sf-account-id',
		sfContactId__c: 'sf-contact-id',
		IdentityId__c: 'identity-id-123',
		batch: null,
		notes: null,
		salesRep: null,
	},
	billingAndPayment: {
		currency: 'GBP',
		paymentGateway: 'Stripe PaymentIntents GNM Membership',
		autoPay: true,
	},
	billToContact: {
		firstName: 'John',
		lastName: 'Doe',
		workEmail: 'john@example.com',
		country: 'GB',
		address1: '1 Kings Place',
		address2: null,
		city: 'London',
		state: null,
		zipCode: 'N1 9GU',
		SpecialDeliveryInstructions__c: null,
	},
	soldToContact: null,
};

const ccRefTxPaymentMethods = {
	defaultPaymentMethodId: 'pm-ccrt-id',
	paymentGateway: 'Stripe PaymentIntents GNM Membership',
	creditcardreferencetransaction: [
		{
			id: 'pm-ccrt-id',
			type: 'CreditCardReferenceTransaction',
			isDefault: true,
			tokenId: 'tok_stripe_123',
			secondTokenId: 'cus_stripe_456',
			cardNumber: null,
			expirationMonth: null,
			expirationYear: null,
			creditCardType: null,
			accountKey: 'account-hex-id-123',
			paymentMethodNumber: null,
			status: 'Active',
			lastTransaction: null,
			useDefaultRetryRule: true,
			bankIdentificationNumber: null,
			deviceSessionId: null,
			existingMandate: null,
			ipAddress: null,
			lastFailedSaleTransactionDate: null,
			lastTransactionDateTime: null,
			lastTransactionStatus: null,
			maxConsecutivePaymentFailures: null,
			numConsecutiveFailures: 0,
			paymentRetryWindow: null,
			totalNumberOfProcessedPayments: 0,
			totalNumberOfErrorPayments: 0,
			createdDate: '2024-01-01',
			updatedDate: '2024-01-01',
			createdBy: 'user',
			updatedBy: 'user',
			accountHolderInfo: { accountHolderName: null },
			identityNumber: null,
			mandateInfo: {
				mandateStatus: null,
				mandateReason: null,
				mandateId: null,
			},
		},
	],
};

const bankTransferPaymentMethods = {
	defaultPaymentMethodId: 'pm-bt-id',
	paymentGateway: 'GoCardless',
	banktransfer: [
		{
			id: 'pm-bt-id',
			type: 'Bacs',
			isDefault: true,
			bankTransferType: 'BACS',
			IBAN: 'GB29NWBK60161331926819',
			businessIdentificationCode: null,
			accountNumber: '****6819',
			bankCode: '601613',
			branchCode: null,
			identityNumber: null,
			accountKey: 'account-hex-id-123',
			paymentMethodNumber: null,
			status: 'Active',
			lastTransaction: null,
			useDefaultRetryRule: true,
			bankIdentificationNumber: null,
			deviceSessionId: null,
			existingMandate: null,
			ipAddress: null,
			lastFailedSaleTransactionDate: null,
			lastTransactionDateTime: null,
			lastTransactionStatus: null,
			maxConsecutivePaymentFailures: null,
			numConsecutiveFailures: 0,
			paymentRetryWindow: null,
			totalNumberOfProcessedPayments: 0,
			totalNumberOfErrorPayments: 0,
			createdDate: '2024-01-01',
			updatedDate: '2024-01-01',
			createdBy: 'user',
			updatedBy: 'user',
			accountHolderInfo: { accountHolderName: 'John Doe' },
			mandateInfo: {
				mandateStatus: null,
				mandateReason: null,
				mandateId: 'GC-MANDATE-001',
			},
		},
	],
};

const orderResponse = {
	orderNumber: 'ORD-001',
	accountNumber: 'A00099999',
	subscriptionNumbers: ['A-S00099999'],
};

describe('cloneAccountWithSubscription', () => {
	it('creates a new account via the Orders API with newAccount (not existingAccountNumber)', async () => {
		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(baseSourceAccount)
			.mockResolvedValueOnce(ccRefTxPaymentMethods);
		const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		const result = await cloneAccountWithSubscription(
			client,
			productCatalog,
			{
				sourceAccountNumber: 'A00001234',
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
			},
			undefined,
		);

		const [path, body] = mockPost.mock.calls[0] as [string, string];
		expect(path).toBe('/v1/orders');
		const parsed = JSON.parse(body) as Record<string, unknown>;
		expect(parsed).toHaveProperty('newAccount');
		expect(parsed).not.toHaveProperty('existingAccountNumber');
		expect(result.accountNumber).toBe('A00099999');
		expect(result.subscriptionNumbers).toEqual(['A-S00099999']);
	});

	it('copies crmId, sfContactId__c and IdentityId__c from source account', async () => {
		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(baseSourceAccount)
			.mockResolvedValueOnce(ccRefTxPaymentMethods);
		const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await cloneAccountWithSubscription(
			client,
			productCatalog,
			{
				sourceAccountNumber: 'A00001234',
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
				createdRequestId: 'req-abc',
			},
			undefined,
		);

		const [, body] = mockPost.mock.calls[0] as [string, string];
		const parsed = JSON.parse(body) as {
			newAccount: {
				crmId: string;
				customFields: {
					sfContactId__c: string;
					IdentityId__c: string;
					CreatedRequestId__c: string;
				};
			};
		};
		expect(parsed.newAccount.crmId).toBe('sf-account-id');
		expect(parsed.newAccount.customFields.sfContactId__c).toBe('sf-contact-id');
		expect(parsed.newAccount.customFields.IdentityId__c).toBe(
			'identity-id-123',
		);
		expect(parsed.newAccount.customFields.CreatedRequestId__c).toBe('req-abc');
	});

	it('maps zipCode to postalCode on billToContact for the Orders API', async () => {
		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(baseSourceAccount)
			.mockResolvedValueOnce(ccRefTxPaymentMethods);
		const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await cloneAccountWithSubscription(
			client,
			productCatalog,
			{
				sourceAccountNumber: 'A00001234',
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
			},
			undefined,
		);

		const [, body] = mockPost.mock.calls[0] as [string, string];
		const parsed = JSON.parse(body) as {
			newAccount: { billToContact: Record<string, unknown> };
		};
		expect(parsed.newAccount.billToContact.postalCode).toBe('N1 9GU');
		expect(parsed.newAccount.billToContact).not.toHaveProperty('zipCode');
	});

	it('sets soldToContact from source account soldToContact for delivery products', async () => {
		const sourceWithSoldTo = {
			...baseSourceAccount,
			billingAndPayment: {
				...baseSourceAccount.billingAndPayment,
				paymentGateway: 'GoCardless',
			},
			soldToContact: {
				firstName: 'Jane',
				lastName: 'Doe',
				workEmail: 'jane@example.com',
				country: 'GB',
				address1: '2 Delivery Road',
				address2: null,
				city: 'Manchester',
				state: null,
				zipCode: 'M1 1AA',
				SpecialDeliveryInstructions__c: 'Leave at door',
			},
		};

		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(sourceWithSoldTo)
			.mockResolvedValueOnce(ccRefTxPaymentMethods);
		const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await cloneAccountWithSubscription(
			client,
			productCatalog,
			{
				sourceAccountNumber: 'A00001234',
				productPurchase: {
					product: 'GuardianWeeklyDomestic',
					ratePlan: 'Monthly',
					firstDeliveryDate: new Date('2026-04-01'),
				},
			},
			undefined,
		);

		const [, body] = mockPost.mock.calls[0] as [string, string];
		const parsed = JSON.parse(body) as {
			newAccount: { soldToContact: Record<string, unknown> };
		};
		expect(parsed.newAccount.soldToContact.firstName).toBe('Jane');
		expect(parsed.newAccount.soldToContact.postalCode).toBe('M1 1AA');
		expect(parsed.newAccount.soldToContact.SpecialDeliveryInstructions__c).toBe(
			'Leave at door',
		);
	});

	it('throws for BankTransfer (GoCardless) payment methods', async () => {
		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(baseSourceAccount)
			.mockResolvedValueOnce(bankTransferPaymentMethods);
		const mockPost = jest.fn();
		const client = buildMockZuoraClient(mockGet, mockPost);

		await expect(
			cloneAccountWithSubscription(
				client,
				productCatalog,
				{
					sourceAccountNumber: 'A00001234',
					productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
				},
				undefined,
			),
		).rejects.toThrow(/BankTransfer \(GoCardless\)/);
	});

	it('passes createdRequestId as idempotency key', async () => {
		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(baseSourceAccount)
			.mockResolvedValueOnce(ccRefTxPaymentMethods);
		const mockPost = jest.fn().mockResolvedValueOnce(orderResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await cloneAccountWithSubscription(
			client,
			productCatalog,
			{
				sourceAccountNumber: 'A00001234',
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
				createdRequestId: 'MY-IDEMPOTENCY-KEY',
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
		const mockGet = jest
			.fn()
			.mockResolvedValueOnce(baseSourceAccount)
			.mockResolvedValueOnce(ccRefTxPaymentMethods);
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

		await cloneAccountWithSubscription(
			client,
			productCatalog,
			{
				sourceAccountNumber: 'A00001234',
				productPurchase: {
					product: 'DigitalSubscription',
					ratePlan: 'Monthly',
				},
				appliedPromotion: {
					promoCode: 'PROMO25',
					supportRegionId: SupportRegionId.UK,
				},
			},
			promotion,
		);

		const [, body] = mockPost.mock.calls[0] as [string, string];
		const parsed = JSON.parse(body) as {
			subscriptions: Array<{ customFields: Record<string, string> }>;
		};
		const customFields = parsed.subscriptions[0]?.customFields;
		expect(customFields?.InitialPromotionCode__c).toBe('PROMO25');
		expect(customFields?.PromotionCode__c).toBe('PROMO25');
	});
});
