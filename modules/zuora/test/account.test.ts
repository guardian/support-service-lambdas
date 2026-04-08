import { cloneAccount } from '@modules/zuora/account';
import type { GoCardlessClient } from '@modules/zuora/goCardlessClient';
import {
	cloneAccountSchema,
	createAccountResponseSchema,
} from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const buildMockZuoraClient = (
	mockGet: jest.Mock,
	mockPost: jest.Mock,
): jest.Mocked<ZuoraClient> =>
	({
		zuoraServerUrl: 'https://zuora.example',
		tokenProvider: {
			getToken: jest.fn().mockResolvedValue('test-token'),
		},
		get: mockGet,
		post: mockPost,
		put: jest.fn(),
		delete: jest.fn(),
		fetch: jest.fn(),
	}) as unknown as jest.Mocked<ZuoraClient>;

const buildMockGoCardlessClient = (
	mockGcGet: jest.Mock,
	mockGcPost: jest.Mock,
): jest.Mocked<GoCardlessClient> =>
	({
		get: mockGcGet,
		post: mockGcPost,
	}) as unknown as jest.Mocked<GoCardlessClient>;

const baseAccountData = {
	basicInfo: {
		id: 'account-id-123',
		name: 'Test Account',
		accountNumber: 'A00001234',
		status: 'Active',
		notes: 'Some notes',
		crmId: 'sf-account-id',
		batch: 'Batch1',
		salesRep: null,
	},
	billingAndPayment: {
		billCycleDay: 1,
		currency: 'GBP',
		paymentTerm: 'Due Upon Receipt',
		paymentGateway: 'Stripe PaymentIntents GNM Membership',
		defaultPaymentMethodId: 'pm-default-id',
		invoiceDeliveryPrefsEmail: true,
		invoiceDeliveryPrefsPrint: false,
		autoPay: true,
	},
	billToContact: {
		firstName: 'John',
		lastName: 'Smith',
		workEmail: 'john@example.com',
		country: 'GB',
		address1: '1 Test Street',
		city: 'London',
		zipCode: 'EC1A 1BB',
	},
};

const basePaymentMethodsData = {
	defaultPaymentMethodId: 'pm-default-id',
	paymentGateway: 'Stripe PaymentIntents GNM Membership',
};

describe('cloneAccount', () => {
	const mockGet = jest.fn();
	const mockPost = jest.fn();
	const mockZuoraClient = buildMockZuoraClient(mockGet, mockPost);

	const parsePostBody = (callIndex = 0): Record<string, unknown> => {
		const callArgs = mockPost.mock.calls[callIndex] as string;
		return JSON.parse(callArgs[1] ?? '') as Record<string, unknown>;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockPost.mockResolvedValue({
			accountId: 'new-account-id',
			accountNumber: 'A00001235',
		});
	});

	it('fetches account data with cloneAccountSchema', async () => {
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcardreferencetransaction: [
				{
					id: 'pm-default-id',
					type: 'CreditCardReferenceTransaction',
					isDefault: true,
					tokenId: 'tok_123',
					secondTokenId: 'cus_456',
					cardNumber: '**** **** **** 4242',
					expirationMonth: 12,
					expirationYear: 2026,
					creditCardType: 'Visa',
					accountHolderInfo: { accountHolderName: 'John Smith' },
				},
			],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		expect(mockGet).toHaveBeenNthCalledWith(
			1,
			'v1/accounts/A00001234',
			cloneAccountSchema,
		);
	});

	it('fetches payment methods for the account id from basicInfo', async () => {
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcardreferencetransaction: [
				{
					id: 'pm-default-id',
					type: 'CreditCardReferenceTransaction',
					isDefault: true,
					tokenId: 'tok_123',
					secondTokenId: 'cus_456',
					cardNumber: '**** **** **** 4242',
					expirationMonth: 12,
					expirationYear: 2026,
					creditCardType: 'Visa',
					accountHolderInfo: { accountHolderName: 'John Smith' },
				},
			],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		expect(mockGet).toHaveBeenNthCalledWith(
			2,
			'/v1/accounts/account-id-123/payment-methods',
			expect.anything(),
		);
	});

	it('creates a new account via POST and returns the new account number', async () => {
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcardreferencetransaction: [
				{
					id: 'pm-default-id',
					type: 'CreditCardReferenceTransaction',
					isDefault: true,
					tokenId: 'tok_123',
					secondTokenId: 'cus_456',
					cardNumber: '**** **** **** 4242',
					expirationMonth: 12,
					expirationYear: 2026,
					creditCardType: 'Visa',
					accountHolderInfo: { accountHolderName: 'John Smith' },
				},
			],
		});

		const result = await cloneAccount(mockZuoraClient, 'A00001234');

		expect(result).toBe('A00001235');
		expect(mockPost).toHaveBeenCalledWith(
			'/v1/accounts',
			expect.any(String),
			createAccountResponseSchema,
		);
	});

	it('copies CreditCardReferenceTransaction payment method fields', async () => {
		const ccRefTx = {
			id: 'pm-default-id',
			type: 'CreditCardReferenceTransaction',
			isDefault: true,
			tokenId: 'tok_stripe_123',
			secondTokenId: 'cus_stripe_456',
			cardNumber: null,
			expirationMonth: null,
			expirationYear: null,
			creditCardType: null,
			accountHolderInfo: {
				accountHolderName: null,
				email: null,
			},
		};
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcardreferencetransaction: [ccRefTx],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody.paymentMethod).toEqual({
			type: 'CreditCardReferenceTransaction',
			tokenId: 'tok_stripe_123',
			secondTokenId: 'cus_stripe_456',
		});
	});

	it('copies CreditCard payment method fields', async () => {
		const creditCard = {
			id: 'pm-default-id',
			type: 'CreditCard',
			isDefault: true,
			cardNumber: '**** **** **** 1234',
			expirationMonth: 6,
			expirationYear: 2027,
			creditCardType: 'MasterCard',
			accountHolderInfo: { accountHolderName: 'Jane Doe', email: null },
			mandateInfo: {
				mandateStatus: null,
				mandateReason: null,
				mandateId: null,
			},
		};
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcard: [creditCard],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody.paymentMethod).toEqual({
			type: 'CreditCard',
			cardNumber: '**** **** **** 1234',
			expirationMonth: 6,
			expirationYear: 2027,
			creditCardType: 'MasterCard',
			accountHolderInfo: { accountHolderName: 'Jane Doe', email: null },
		});
	});

	it('copies PayPal payment method fields', async () => {
		const paypal = {
			id: 'pm-default-id',
			type: 'PayPal',
			isDefault: true,
			BAID: 'B-12345',
			email: 'paypal@example.com',
		};
		mockGet
			.mockResolvedValueOnce(baseAccountData)
			.mockResolvedValueOnce({ ...basePaymentMethodsData, paypal: [paypal] });

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody.paymentMethod).toEqual({
			type: 'PayPal',
			BAID: 'B-12345',
			email: 'paypal@example.com',
		});
	});

	it('clones BankTransfer payment method via GoCardless bank details from IBAN', async () => {
		const bankTransfer = {
			id: 'pm-default-id',
			type: 'BankTransfer',
			isDefault: true,
			bankTransferType: 'DirectDebitUK',
			IBAN: '****9911',
			accountNumber: '****9911',
			bankCode: '200000',
			branchCode: null,
			identityNumber: null,
			accountHolderInfo: { accountHolderName: 'John Smith', email: null },
			mandateInfo: {
				mandateId: null,
				mandateStatus: null,
				mandateReason: null,
			},
		};
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			banktransfer: [bankTransfer],
		});
		// ZOQL query for TokenId returns the GoCardless mandate ID
		mockPost
			.mockResolvedValueOnce({
				records: [{ Id: 'pm-default-id', TokenId: 'MD000EXISTING123' }],
			})
			// Create Account call
			.mockResolvedValueOnce({
				accountId: 'new-account-id',
				accountNumber: 'A00001235',
			});

		// getMandate returns the mandate with customer_bank_account ID
		// getCustomerBankAccount returns bank account details including IBAN
		const mockGcGet = jest
			.fn()
			.mockResolvedValueOnce({
				mandates: {
					id: 'MD000EXISTING123',
					reference: 'REF-OLD-456',
					scheme: 'bacs',
					links: { customer_bank_account: 'BA000BANKACCT789' },
				},
			})
			.mockResolvedValueOnce({
				customer_bank_accounts: {
					id: 'BA000BANKACCT789',
					account_holder_name: 'John Smith',
					account_number_ending: '11',
					country_code: 'GB',
					currency: 'GBP',
					// UK IBAN: sort_code (6 chars at pos 8) = 200000, account_number (8 chars at pos 14) = 55779911
					iban: 'GB60BARC20000055779911',
				},
			});
		const mockGcPost = jest.fn();
		const mockGoCardlessClient = buildMockGoCardlessClient(
			mockGcGet,
			mockGcPost,
		);

		await cloneAccount(mockZuoraClient, 'A00001234', mockGoCardlessClient);

		// Verify GoCardless was called to get the existing mandate
		expect(mockGcGet).toHaveBeenNthCalledWith(
			1,
			'/mandates/MD000EXISTING123',
			expect.anything(),
		);
		// Verify GoCardless was called to get the customer bank account
		expect(mockGcGet).toHaveBeenNthCalledWith(
			2,
			'/customer_bank_accounts/BA000BANKACCT789',
			expect.anything(),
		);
		// Verify no new mandate was pre-created in GoCardless (Zuora handles this internally)
		expect(mockGcPost).not.toHaveBeenCalled();

		// Verify the Zuora account is created with Bacs bank details
		const postBody = parsePostBody(1); // First POST is the ZOQL query; second is create account
		expect(postBody.paymentMethod).toEqual({
			type: 'Bacs',
			bankCode: '200000',
			accountNumber: '55779911',
			accountHolderInfo: { accountHolderName: 'John Smith', email: null },
		});
	});

	it('throws if GoCardless client is not provided for BankTransfer', async () => {
		const bankTransfer = {
			id: 'pm-default-id',
			type: 'BankTransfer',
			isDefault: true,
			bankTransferType: 'DirectDebitUK',
			IBAN: '****9911',
			accountNumber: '****9911',
			bankCode: '200000',
			branchCode: null,
			identityNumber: null,
			accountHolderInfo: { accountHolderName: 'John Smith', email: null },
			mandateInfo: {
				mandateId: null,
				mandateStatus: null,
				mandateReason: null,
			},
		};
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			banktransfer: [bankTransfer],
		});

		await expect(
			cloneAccount(mockZuoraClient, 'A00001234'),
		).rejects.toThrow(
			'GoCardless client required to clone BankTransfer payment method',
		);
	});

	it('copies billToContact and soldToContact fields', async () => {
		const accountWithSoldTo = {
			...baseAccountData,
			soldToContact: {
				firstName: 'Jane',
				lastName: 'Doe',
				workEmail: 'jane@example.com',
				country: 'GB',
			},
		};
		mockGet.mockResolvedValueOnce(accountWithSoldTo).mockResolvedValueOnce({
			...basePaymentMethodsData,
			paypal: [
				{
					id: 'pm-default-id',
					type: 'PayPal',
					isDefault: true,
					BAID: 'B-1',
					email: 'p@example.com',
				},
			],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody).toMatchObject({
			billToContact: { firstName: 'John' },
			soldToContact: { firstName: 'Jane' },
		});
	});

	it('copies custom fields from basicInfo', async () => {
		const accountWithCustomFields = {
			...baseAccountData,
			basicInfo: {
				...baseAccountData.basicInfo,
				IdentityId__c: 'identity-123',
				sfContactId__c: 'sf-contact-456',
			},
		};
		mockGet
			.mockResolvedValueOnce(accountWithCustomFields)
			.mockResolvedValueOnce({
				...basePaymentMethodsData,
				paypal: [
					{
						id: 'pm-default-id',
						type: 'PayPal',
						isDefault: true,
						BAID: 'B-1',
						email: 'p@example.com',
					},
				],
			});

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody.IdentityId__c).toBe('identity-123');
		expect(postBody.sfContactId__c).toBe('sf-contact-456');
	});

	it('does not copy system fields from basicInfo', async () => {
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			paypal: [
				{
					id: 'pm-default-id',
					type: 'PayPal',
					isDefault: true,
					BAID: 'B-1',
					email: 'p@example.com',
				},
			],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody.id).toBeUndefined();
		expect(postBody.accountNumber).toBeUndefined();
		expect(postBody.status).toBeUndefined();
	});

	it('throws if the default payment method is not found in any payment method list', async () => {
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcard: [],
			creditcardreferencetransaction: [],
		});

		await expect(cloneAccount(mockZuoraClient, 'A00001234')).rejects.toThrow(
			'Could not find default payment method pm-default-id for account A00001234',
		);
	});

	it('uses only the default payment method when multiple exist', async () => {
		mockGet.mockResolvedValueOnce(baseAccountData).mockResolvedValueOnce({
			...basePaymentMethodsData,
			creditcardreferencetransaction: [
				{
					id: 'pm-other-id',
					type: 'CreditCardReferenceTransaction',
					isDefault: false,
					tokenId: 'tok_other',
					secondTokenId: 'cus_other',
					cardNumber: null,
					expirationMonth: null,
					expirationYear: null,
					creditCardType: null,
					accountHolderInfo: { accountHolderName: null },
				},
				{
					id: 'pm-default-id',
					type: 'CreditCardReferenceTransaction',
					isDefault: true,
					tokenId: 'tok_default',
					secondTokenId: 'cus_default',
					cardNumber: null,
					expirationMonth: null,
					expirationYear: null,
					creditCardType: null,
					accountHolderInfo: { accountHolderName: null },
				},
			],
		});

		await cloneAccount(mockZuoraClient, 'A00001234');

		const postBody = parsePostBody();
		expect(postBody).toMatchObject({
			paymentMethod: { tokenId: 'tok_default' },
		});
	});
});
