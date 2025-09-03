import type { PaymentDisputeRecord } from '../../src/interfaces';
import { upsertPaymentDisputeInSalesforce } from '../../src/services/salesforceCreate';
import type { SalesforceAuthResponse } from '../../src/types';

// Mock dependencies
jest.mock('../../src/helpers', () => ({
	buildSalesforceUpsertUrl: jest.fn(
		() =>
			'https://test.salesforce.com/services/data/v58.0/sobjects/Payment_Dispute__c/Dispute_ID__c/du_test123',
	),
	buildSalesforceUpsertOptions: jest.fn(() => ({
		method: 'PATCH',
		headers: {
			Authorization: 'Bearer mock_token',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ test: 'body' }),
	})),
}));

jest.mock('../../src/zod-schemas', () => ({
	SalesforceCreateResponseSchema: {
		safeParse: jest.fn(),
	},
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Salesforce Create Service', () => {
	const mockAuthResponse: SalesforceAuthResponse = {
		access_token: 'mock_token',
		instance_url: 'https://test.salesforce.com',
		id: 'https://test.salesforce.com/id/123',
		token_type: 'Bearer',
		issued_at: '1234567890',
		signature: 'mock_signature',
	};

	const mockPaymentDispute: PaymentDisputeRecord = {
		attributes: { type: 'Payment_Dispute__c' },
		Dispute_ID__c: 'du_test123',
		Charge_ID__c: 'ch_test123',
		Reason__c: 'fraudulent',
		Status__c: 'needs_response',
		Amount__c: 100.0,
		Evidence_Due_Date__c: '2025-08-21',
		Payment_Intent_ID__c: 'pi_test123',
		Network_Reason_Code__c: '4855',
		Is_Charge_Refundable__c: true,
		Created_Date__c: '2025-08-21T10:11:22.000Z',
		Has_Evidence__c: false,
		SubscriptionNumber__c: 'SUB-001',
		PaymentId__c: 'payment-123',
		AccountId__c: 'account-456',
		InvoiceId__c: 'invoice-789',
	};

	const mockCreateResponse = {
		id: 'sf_record_123',
		success: true,
		errors: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock successful validation
		const { SalesforceCreateResponseSchema } = require('../../src/zod-schemas');
		SalesforceCreateResponseSchema.safeParse.mockReturnValue({
			success: true,
			data: mockCreateResponse,
		});
	});

	describe('upsertPaymentDisputeInSalesforce', () => {
		it('should successfully upsert payment dispute', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockCreateResponse),
			});

			const result = await upsertPaymentDisputeInSalesforce(
				mockAuthResponse,
				mockPaymentDispute,
			);

			expect(result).toEqual(mockCreateResponse);
			expect(global.fetch).toHaveBeenCalledWith(
				'https://test.salesforce.com/services/data/v58.0/sobjects/Payment_Dispute__c/Dispute_ID__c/du_test123',
				{
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer mock_token',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ test: 'body' }),
				},
			);
		});

		it('should throw error when Salesforce returns non-ok response', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: () => Promise.resolve('Invalid field value'),
			});

			await expect(
				upsertPaymentDisputeInSalesforce(mockAuthResponse, mockPaymentDispute),
			).rejects.toThrow(
				'Error upserting Payment Dispute in Salesforce: Bad Request - Invalid field value',
			);
		});

		it('should throw error when response validation fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockCreateResponse),
			});

			const {
				SalesforceCreateResponseSchema,
			} = require('../../src/zod-schemas');
			SalesforceCreateResponseSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					format: () => ({ success: { _errors: ['Required'] } }),
				},
			});

			await expect(
				upsertPaymentDisputeInSalesforce(mockAuthResponse, mockPaymentDispute),
			).rejects.toThrow(
				'Error upserting Payment Dispute in Salesforce: Error parsing response from Salesforce',
			);
		});

		it('should handle fetch network errors', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			await expect(
				upsertPaymentDisputeInSalesforce(mockAuthResponse, mockPaymentDispute),
			).rejects.toThrow(
				'Error upserting Payment Dispute in Salesforce: Network error',
			);
		});
	});
});
