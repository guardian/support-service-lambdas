import {
	buildSalesforceUpsertOptions,
	buildSalesforceUpsertUrl,
} from '../../src/helpers/salesforce-create.helper';
import type { PaymentDisputeRecord } from '../../src/interfaces';
import type { SalesforceAuthResponse } from '../../src/types';

// Mock will be handled by global __mocks__ folder

describe('Salesforce Create Helper', () => {
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
	};

	describe('buildSalesforceUpsertUrl', () => {
		it('should build correct upsert URL', () => {
			const result = buildSalesforceUpsertUrl(
				mockAuthResponse,
				mockPaymentDispute,
			);

			expect(result).toBe(
				'https://test.salesforce.com/services/data/v58.0/sobjects/Payment_Dispute__c/Dispute_ID__c/du_test123',
			);
		});
	});

	describe('buildSalesforceUpsertOptions', () => {
		it('should build correct fetch options', () => {
			const paymentDisputeBody = {
				attributes: { type: 'Payment_Dispute__c' },
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
			};

			const result = buildSalesforceUpsertOptions(
				mockAuthResponse,
				paymentDisputeBody,
			);

			expect(result).toEqual({
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer mock_token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(paymentDisputeBody),
			});
		});
	});
});
