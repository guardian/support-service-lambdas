import {
	listenDisputeClosedInputSchema,
	type ListenDisputeClosedRequestBody,
	listenDisputeCreatedInputSchema,
	type ListenDisputeCreatedRequestBody,
} from '../src/requestSchema';

// Sample valid Stripe webhook payload data
const validStripeDisputeData = {
	object: {
		id: 'du_0RyWbmItVxyc3Q6nfUmdWln0',
		charge: 'ch_2RyWblItVxyc3Q6n1O2UvibN',
		amount: 100,
		currency: 'usd',
		reason: 'fraudulent',
		status: 'warning_needs_response',
		created: 1755775482,
		is_charge_refundable: true,
		payment_intent: 'pi_2RyWblItVxyc3Q6n1HTvnARE',
		evidence_details: {
			due_by: 1756511999,
			has_evidence: false,
		},
		payment_method_details: {
			card: {
				network_reason_code: '10',
			},
		},
	},
};

describe('Request Schema Validation', () => {
	describe('listenDisputeCreatedInputSchema', () => {
		it('should validate valid Stripe dispute created webhook', () => {
			const validInput = {
				id: 'evt_0RyWbnItVxyc3Q6nNuuOgbbN',
				type: 'charge.dispute.created' as const,
				data: validStripeDisputeData,
			};

			const result = listenDisputeCreatedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
			expect(result.id).toBe('evt_0RyWbnItVxyc3Q6nNuuOgbbN');
			expect(result.type).toBe('charge.dispute.created');
			expect(result.data.object.id).toBe('du_0RyWbmItVxyc3Q6nfUmdWln0');
		});

		it('should reject input without required fields', () => {
			const invalidInput = {};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with wrong event type', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.closed',
				data: validStripeDisputeData,
			};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with missing dispute data fields', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.created' as const,
				data: {
					object: {
						id: 'du_123',
						// Missing required fields
					},
				},
			};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with invalid amount type', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.created' as const,
				data: {
					object: {
						...validStripeDisputeData.object,
						amount: '100', // Should be number, not string
					},
				},
			};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with invalid boolean type', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.created' as const,
				data: {
					object: {
						...validStripeDisputeData.object,
						is_charge_refundable: 'true', // Should be boolean, not string
					},
				},
			};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should match TypeScript type', () => {
			const validInput: ListenDisputeCreatedRequestBody = {
				id: 'evt_123',
				type: 'charge.dispute.created',
				data: validStripeDisputeData,
			};

			const result = listenDisputeCreatedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
		});
	});

	describe('listenDisputeClosedInputSchema', () => {
		it('should validate valid Stripe dispute closed webhook', () => {
			const validInput = {
				id: 'evt_0RyWbnItVxyc3Q6nNuuOgbbN',
				type: 'charge.dispute.closed' as const,
				data: validStripeDisputeData,
			};

			const result = listenDisputeClosedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
			expect(result.id).toBe('evt_0RyWbnItVxyc3Q6nNuuOgbbN');
			expect(result.type).toBe('charge.dispute.closed');
			expect(result.data.object.id).toBe('du_0RyWbmItVxyc3Q6nfUmdWln0');
		});

		it('should reject input without required fields', () => {
			const invalidInput = {};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with wrong event type', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.created',
				data: validStripeDisputeData,
			};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with missing evidence_details', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.closed' as const,
				data: {
					object: {
						...validStripeDisputeData.object,
						evidence_details: undefined,
					},
				},
			};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with missing payment_method_details', () => {
			const invalidInput = {
				id: 'evt_123',
				type: 'charge.dispute.closed' as const,
				data: {
					object: {
						...validStripeDisputeData.object,
						payment_method_details: undefined,
					},
				},
			};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should match TypeScript type', () => {
			const validInput: ListenDisputeClosedRequestBody = {
				id: 'evt_123',
				type: 'charge.dispute.closed',
				data: validStripeDisputeData,
			};

			const result = listenDisputeClosedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
		});
	});

	describe('Schema data validation', () => {
		it('should validate all required dispute object fields', () => {
			const testData = {
				id: 'evt_123',
				type: 'charge.dispute.created' as const,
				data: validStripeDisputeData,
			};

			const result = listenDisputeCreatedInputSchema.parse(testData);

			// Verify all mapped fields are present
			expect(result.data.object.id).toBeDefined(); // Dispute_ID__c
			expect(result.data.object.charge).toBeDefined(); // Charge_ID__c
			expect(result.data.object.amount).toBeDefined(); // Amount__c
			expect(result.data.object.currency).toBeDefined(); // Currency for Amount__c
			expect(result.data.object.reason).toBeDefined(); // Reason__c
			expect(result.data.object.status).toBeDefined(); // Status__c
			expect(result.data.object.created).toBeDefined(); // Created_Date__c
			expect(result.data.object.is_charge_refundable).toBeDefined(); // Is_Charge_Refundable__c
			expect(result.data.object.payment_intent).toBeDefined(); // Payment_Intent_ID__c
			expect(result.data.object.evidence_details.due_by).toBeDefined(); // Evidence_Due_Date__c
			expect(result.data.object.evidence_details.has_evidence).toBeDefined(); // Has_Evidence__c
			expect(
				result.data.object.payment_method_details.card.network_reason_code,
			).toBeDefined(); // Network_Reason_Code__c
		});

		it('should validate timestamp fields are numbers', () => {
			const testData = {
				id: 'evt_123',
				type: 'charge.dispute.created' as const,
				data: validStripeDisputeData,
			};

			const result = listenDisputeCreatedInputSchema.parse(testData);

			expect(typeof result.data.object.created).toBe('number');
			expect(typeof result.data.object.evidence_details.due_by).toBe('number');
		});

		it('should validate boolean fields are booleans', () => {
			const testData = {
				id: 'evt_123',
				type: 'charge.dispute.created' as const,
				data: validStripeDisputeData,
			};

			const result = listenDisputeCreatedInputSchema.parse(testData);

			expect(typeof result.data.object.is_charge_refundable).toBe('boolean');
			expect(typeof result.data.object.evidence_details.has_evidence).toBe(
				'boolean',
			);
		});
	});
});
