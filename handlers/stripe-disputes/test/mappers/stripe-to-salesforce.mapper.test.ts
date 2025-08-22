import type { ListenDisputeCreatedRequestBody } from '../../src/dtos';
import { mapStripeDisputeToSalesforce } from '../../src/mappers/stripe-to-salesforce.mapper';

// Mock the timestamp helpers
jest.mock('../../src/helpers/timestamp.helper', () => ({
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
			});
		});

		it('should handle zero amount', () => {
			const mockStripeData: ListenDisputeCreatedRequestBody = {
				id: 'evt_test123',
				type: 'charge.dispute.created',
				data: {
					object: {
						id: 'du_test123',
						charge: 'ch_test123',
						amount: 0,
						currency: 'usd',
						reason: 'fraudulent',
						status: 'needs_response',
						created: 1640995200,
						is_charge_refundable: false,
						payment_intent: 'pi_test123',
						evidence_details: {
							due_by: 1641081600,
							has_evidence: true,
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

			expect(result.Amount__c).toBe(0);
			expect(result.Is_Charge_Refundable__c).toBe(false);
			expect(result.Has_Evidence__c).toBe(true);
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
	});
});
