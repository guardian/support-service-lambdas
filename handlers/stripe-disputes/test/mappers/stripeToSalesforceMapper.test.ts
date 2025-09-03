import type { ListenDisputeCreatedRequestBody } from '../../src/dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../../src/interfaces';
import { mapStripeDisputeToSalesforce } from '../../src/mappers/stripeToSalesforceMapper';

// Mock the timestamp helpers
jest.mock('../../src/helpers/timestampHelper', () => ({
	timestampToSalesforceDateTime: jest.fn((timestamp) =>
		new Date(timestamp * 1000).toISOString(),
	),
	timestampToSalesforceDate: jest.fn(
		(timestamp) => new Date(timestamp * 1000).toISOString().split('T')[0],
	),
}));

describe('Stripe to Salesforce Mapper', () => {
	describe('mapStripeDisputeToSalesforce', () => {
		it('should correctly map Stripe dispute data to Salesforce format', () => {
			const mockStripeData: ListenDisputeCreatedRequestBody = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: {
					object: {
						id: 'du_test123',
						charge: 'ch_test123',
						amount: 10000, // $100.00 in cents
						currency: 'usd',
						reason: 'fraudulent',
						status: 'needs_response',
						created: 1640995200,
						is_charge_refundable: true,
						payment_intent: 'pi_test123',
						evidence_details: {
							due_by: 1641081600,
							has_evidence: false,
						},
						payment_method_details: {
							card: {
								network_reason_code: '4855',
							},
						},
					},
				},
			};

			const result = mapStripeDisputeToSalesforce(mockStripeData);

			expect(result).toEqual({
				attributes: {
					type: 'Payment_Dispute__c',
				},
				Dispute_ID__c: 'du_test123',
				Charge_ID__c: 'ch_test123',
				Reason__c: 'fraudulent',
				Status__c: 'needs_response',
				Amount__c: 100.0, // Converted from cents to dollars
				Evidence_Due_Date__c: '2022-01-02', // Mocked timestamp conversion
				Payment_Intent_ID__c: 'pi_test123',
				Network_Reason_Code__c: '4855',
				Is_Charge_Refundable__c: true,
				Created_Date__c: '2022-01-01T00:00:00.000Z', // Mocked timestamp conversion
				Has_Evidence__c: false,
				SubscriptionNumber__c: '',
				PaymentId__c: '',
				AccountId__c: '',
				InvoiceId__c: '',
			});
		});

		it('should handle large amounts correctly', () => {
			const mockStripeData: ListenDisputeCreatedRequestBody = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: {
					object: {
						id: 'du_test123',
						charge: 'ch_test123',
						amount: 123456789, // $1,234,567.89 in cents
						currency: 'usd',
						reason: 'fraudulent',
						status: 'needs_response',
						created: 1640995200,
						is_charge_refundable: true,
						payment_intent: 'pi_test123',
						evidence_details: {
							due_by: 1641081600,
							has_evidence: false,
						},
						payment_method_details: {
							card: {
								network_reason_code: '4855',
							},
						},
					},
				},
			};

			const result = mapStripeDisputeToSalesforce(mockStripeData);

			expect(result.Amount__c).toBe(1234567.89);
		});

		it('should correctly map Stripe dispute data with Zuora data', () => {
			const mockStripeData: ListenDisputeCreatedRequestBody = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: {
					object: {
						id: 'du_test123',
						charge: 'ch_test123',
						amount: 10000,
						currency: 'usd',
						reason: 'fraudulent',
						status: 'needs_response',
						created: 1640995200,
						is_charge_refundable: true,
						payment_intent: 'pi_test123',
						evidence_details: {
							due_by: 1641081600,
							has_evidence: false,
						},
						payment_method_details: {
							card: {
								network_reason_code: '4855',
							},
						},
					},
				},
			};

			const mockZuoraData: ZuoraInvoiceFromStripeChargeIdResult = {
				paymentId: 'payment-123',
				paymentStatus: 'Processed',
				paymentPaymentNumber: 'P-001',
				paymentAccountId: 'account-456',
				paymentReferenceId: 'ch_test123',
				InvoiceId: 'invoice-789',
				paymentsInvoiceId: 'invoice-payment-101',
				subscriptionId: 'subscription-111',
				SubscriptionNumber: 'SUB-001',
			};

			const result = mapStripeDisputeToSalesforce(
				mockStripeData,
				mockZuoraData,
			);

			expect(result).toEqual({
				attributes: {
					type: 'Payment_Dispute__c',
				},
				Dispute_ID__c: 'du_test123',
				Charge_ID__c: 'ch_test123',
				Reason__c: 'fraudulent',
				Status__c: 'needs_response',
				Amount__c: 100.0,
				Evidence_Due_Date__c: '2022-01-02',
				Payment_Intent_ID__c: 'pi_test123',
				Network_Reason_Code__c: '4855',
				Is_Charge_Refundable__c: true,
				Created_Date__c: '2022-01-01T00:00:00.000Z',
				Has_Evidence__c: false,
				SubscriptionNumber__c: 'SUB-001',
				PaymentId__c: 'payment-123',
				AccountId__c: 'account-456',
				InvoiceId__c: 'invoice-789',
			});
		});

		it('should handle partial Zuora data correctly', () => {
			const mockStripeData: ListenDisputeCreatedRequestBody = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: {
					object: {
						id: 'du_test123',
						charge: 'ch_test123',
						amount: 10000,
						currency: 'usd',
						reason: 'fraudulent',
						status: 'needs_response',
						created: 1640995200,
						is_charge_refundable: true,
						payment_intent: 'pi_test123',
						evidence_details: {
							due_by: 1641081600,
							has_evidence: false,
						},
						payment_method_details: {
							card: {
								network_reason_code: '4855',
							},
						},
					},
				},
			};

			const mockPartialZuoraData: ZuoraInvoiceFromStripeChargeIdResult = {
				paymentId: 'payment-123',
				paymentStatus: 'Processed',
				paymentPaymentNumber: 'P-001',
				paymentAccountId: '',
				paymentReferenceId: 'ch_test123',
				InvoiceId: 'invoice-789',
				paymentsInvoiceId: 'invoice-payment-101',
				subscriptionId: 'subscription-111',
				SubscriptionNumber: '',
			};

			const result = mapStripeDisputeToSalesforce(
				mockStripeData,
				mockPartialZuoraData,
			);

			expect(result).toEqual({
				attributes: {
					type: 'Payment_Dispute__c',
				},
				Dispute_ID__c: 'du_test123',
				Charge_ID__c: 'ch_test123',
				Reason__c: 'fraudulent',
				Status__c: 'needs_response',
				Amount__c: 100.0,
				Evidence_Due_Date__c: '2022-01-02',
				Payment_Intent_ID__c: 'pi_test123',
				Network_Reason_Code__c: '4855',
				Is_Charge_Refundable__c: true,
				Created_Date__c: '2022-01-01T00:00:00.000Z',
				Has_Evidence__c: false,
				SubscriptionNumber__c: '',
				PaymentId__c: 'payment-123',
				AccountId__c: '',
				InvoiceId__c: 'invoice-789',
			});
		});
	});
});
