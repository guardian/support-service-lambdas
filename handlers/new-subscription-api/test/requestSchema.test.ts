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
		existingPaymentMethod: {
			id: 'pm-123',
			requiresCloning: false,
		},
		billToContact: {
			firstName: 'John',
			lastName: 'Doe',
			workEmail: 'john.doe@example.com',
			country: 'GB',
			address1: '1 Test Street',
			city: 'London',
			postalCode: 'SW1A 1AA',
		},
		productPurchase: {
			product: 'SupporterPlus',
			ratePlan: 'Monthly',
			amount: 10,
		},
	};

	it('parses a valid request with an existing payment method', () => {
		const result = createSubscriptionRequestSchema.safeParse(validBaseRequest);
		expect(result.success).toBe(true);
	});

	it('parses a valid request with requiresCloning true', () => {
		const request = {
			...validBaseRequest,
			existingPaymentMethod: { id: 'pm-456', requiresCloning: true },
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

	it('rejects invalid createdRequestId (not a UUID)', () => {
		const request = { ...validBaseRequest, createdRequestId: 'not-a-uuid' };
		const result = createSubscriptionRequestSchema.safeParse(request);
		expect(result.success).toBe(false);
	});

	it('rejects missing existingPaymentMethod id', () => {
		const request = {
			...validBaseRequest,
			existingPaymentMethod: { requiresCloning: false },
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
			existingPaymentMethod: {
				id: 'pm-123',
				requiresCloning: false,
			},
			billToContact: {
				firstName: 'Jane',
				lastName: 'Smith',
				workEmail: 'jane@example.com',
				country: 'US',
				address1: '1 Test Street',
				city: 'New York',
				postalCode: '10001',
			},
			productPurchase: {
				product: 'Contribution',
				ratePlan: 'Monthly',
				amount: 5,
			},
		};
		const result = createSubscriptionRequestSchema.safeParse(
			requestWithoutOptionals,
		);
		expect(result.success).toBe(true);
	});
});
