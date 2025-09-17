import {
	listenDisputeClosedInputSchema,
	listenDisputeCreatedInputSchema,
	stripeDisputeDataSchema,
} from '../../src/dtos';

describe('Stripe Dispute DTOs', () => {
	const validStripeDisputeObject = {
		id: 'du_test123',
		charge: 'ch_test123',
		amount: 10000,
		currency: 'usd',
		reason: 'fraudulent',
		status: 'needs_response',
		created: 1755775482,
		is_charge_refundable: true,
		payment_intent: 'pi_test123',
		evidence_details: {
			due_by: 1756511999,
			has_evidence: false,
		},
		payment_method_details: {
			card: {
				network_reason_code: '4855',
			},
		},
	};

	describe('stripeDisputeDataSchema', () => {
		it('should validate valid stripe dispute data', () => {
			const validData = { object: validStripeDisputeObject };
			const result = stripeDisputeDataSchema.safeParse(validData);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.object.id).toBe('du_test123');
				expect(result.data.object.amount).toBe(10000);
			}
		});

		it('should reject missing required fields', () => {
			const invalidData = {
				object: {
					...validStripeDisputeObject,
					id: undefined,
				},
			};

			const result = stripeDisputeDataSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it('should reject invalid field types', () => {
			const invalidData = {
				object: {
					...validStripeDisputeObject,
					amount: 'invalid-amount',
				},
			};

			const result = stripeDisputeDataSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it('should validate nested objects correctly', () => {
			const validData = { object: validStripeDisputeObject };
			const result = stripeDisputeDataSchema.safeParse(validData);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.object.evidence_details.has_evidence).toBe(false);
				expect(
					result.data.object.payment_method_details.card.network_reason_code,
				).toBe('4855');
			}
		});
	});

	describe('listenDisputeCreatedInputSchema', () => {
		it('should validate valid dispute created webhook', () => {
			const validWebhook = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: { object: validStripeDisputeObject },
			};

			const result = listenDisputeCreatedInputSchema.safeParse(validWebhook);
			expect(result.success).toBe(true);
		});

		it('should reject wrong webhook type', () => {
			const invalidWebhook = {
				id: 'evt_test123',
				type: 'charge.dispute.closed',
				data: { object: validStripeDisputeObject },
			};

			const result = listenDisputeCreatedInputSchema.safeParse(invalidWebhook);
			expect(result.success).toBe(false);
		});

		it('should reject missing webhook fields', () => {
			const invalidWebhook = {
				type: 'charge.dispute.created',
				data: { object: validStripeDisputeObject },
			};

			const result = listenDisputeCreatedInputSchema.safeParse(invalidWebhook);
			expect(result.success).toBe(false);
		});
	});

	describe('listenDisputeClosedInputSchema', () => {
		it('should validate valid dispute closed webhook', () => {
			const validWebhook = {
				id: 'evt_test123',
				type: 'charge.dispute.closed',
				data: { object: validStripeDisputeObject },
			};

			const result = listenDisputeClosedInputSchema.safeParse(validWebhook);
			expect(result.success).toBe(true);
		});

		it('should reject wrong webhook type', () => {
			const invalidWebhook = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: { object: validStripeDisputeObject },
			};

			const result = listenDisputeClosedInputSchema.safeParse(invalidWebhook);
			expect(result.success).toBe(false);
		});

		it('should validate with same dispute data schema', () => {
			const validWebhook = {
				id: 'evt_test123',
				type: 'charge.dispute.closed',
				data: { object: validStripeDisputeObject },
			};

			const result = listenDisputeClosedInputSchema.safeParse(validWebhook);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.data.object.id).toBe('du_test123');
				expect(result.data.data.object.charge).toBe('ch_test123');
			}
		});
	});
});
