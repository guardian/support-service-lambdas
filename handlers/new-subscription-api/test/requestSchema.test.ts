import { createSubscriptionRequestSchema } from '../src/requestSchema';

describe('createSubscriptionRequestSchema', () => {
	const validBaseRequest = {
		accountName: 'Test Account',
		createdRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
		salesforceAccountId: 'sf-acc-123',
		salesforceContactId: 'sf-con-123',
		identityId: 'identity-123',
		currency: 'GBP',
		paymentGateway: 'Stripe PaymentIntents GNM Membership',
		paymentMethod: {
			type: 'CreditCardReferenceTransaction',
			tokenId: 'tok_123',
			secondTokenId: 'tok_456',
			cardNumber: '424242424242',
			cardType: 'Visa',
			expirationMonth: 12,
			expirationYear: 2099,
		},
		billToContact: {
			firstName: 'John',
			lastName: 'Doe',
			workEmail: 'john.doe@example.com',
			country: 'GB',
		},
		productPurchase: {
			product: 'SupporterPlus',
			ratePlan: 'Monthly',
			amount: 10,
		},
	};

	it('parses a valid CreditCardReferenceTransaction request', () => {
		const result = createSubscriptionRequestSchema.safeParse(validBaseRequest);
		expect(result.success).toBe(true);
	});

	it('parses a valid DirectDebit (Bacs) request', () => {
		const request = {
			...validBaseRequest,
			paymentGateway: 'GoCardless',
			paymentMethod: {
				type: 'Bacs',
				accountHolderInfo: { accountHolderName: 'John Doe' },
				accountNumber: '12345678',
				bankCode: '123456',
			},
		};
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(true);
	});

	it('parses a valid PayPal request', () => {
		const request = {
			...validBaseRequest,
			paymentGateway: 'PayPal Express',
			paymentMethod: {
				type: 'PayPalNativeEC',
				BAID: 'paypal-baid-123',
				email: 'user@example.com',
			},
		};
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(true);
	});

	it('parses request with optional promoCode', () => {
		const request = { ...validBaseRequest, promoCode: 'PROMO10' };
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.promoCode).toBe('PROMO10');
		}
	});

	it('rejects invalid currency', () => {
		const request = { ...validBaseRequest, currency: 'INVALID' };
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it('rejects invalid email in billToContact', () => {
		const request = {
			...validBaseRequest,
			billToContact: {
				...validBaseRequest.billToContact,
				workEmail: 'not-an-email',
			},
		};
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it('rejects invalid createdRequestId (not a UUID)', () => {
		const request = { ...validBaseRequest, createdRequestId: 'not-a-uuid' };
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it('rejects unknown payment method type', () => {
		const request = {
			...validBaseRequest,
			paymentMethod: { type: 'UnknownMethod', tokenId: '123' },
		};
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it('accepts request without optional fields', () => {
		const requestWithoutOptionals = {
			accountName: 'Test Account',
			createdRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			salesforceAccountId: 'sf-acc-123',
			salesforceContactId: 'sf-con-123',
			identityId: 'identity-123',
			currency: 'USD',
			paymentGateway: 'Stripe PaymentIntents GNM Membership',
			paymentMethod: {
				type: 'CreditCardReferenceTransaction',
				tokenId: 'tok_123',
				secondTokenId: 'tok_456',
				cardNumber: '424242424242',
				expirationMonth: 12,
				expirationYear: 2099,
			},
			billToContact: {
				firstName: 'Jane',
				lastName: 'Smith',
				workEmail: 'jane@example.com',
				country: 'US',
			},
			productPurchase: {
				product: 'Contribution',
				ratePlan: 'Monthly',
			},
		};
		const result = createSubscriptionRequestSchema.safeParse(
			requestWithoutOptionals,
		);
		expect(result.success).toBe(true);
	});
});
