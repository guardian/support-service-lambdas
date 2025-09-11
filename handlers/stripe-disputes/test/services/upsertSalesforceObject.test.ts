import type { Logger } from '@modules/logger';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../../src/dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../../src/interfaces';
import { upsertSalesforceObject } from '../../src/services/upsertSalesforceObject';

jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: jest.fn(),
}));

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'TEST'),
}));

jest.mock('../../src/services/salesforceAuth', () => ({
	authenticateWithSalesforce: jest.fn(),
}));

jest.mock('../../src/mappers', () => ({
	mapStripeDisputeToSalesforce: jest.fn(),
}));

jest.mock('../../src/services/salesforceCreate', () => ({
	upsertPaymentDisputeInSalesforce: jest.fn(),
}));

describe('upsertSalesforceObject', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		mutableAddContext: jest.fn(),
	} as any;

	const mockWebhookData: ListenDisputeCreatedRequestBody = {
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
			},
		},
	};

	const mockSalesforceCredentials = {
		client_id: 'test_client',
		client_secret: 'test_secret',
		username: 'test@example.com',
		password: 'password123',
		token: 'token456',
		sandbox: true,
	};

	const mockSalesforceAuth = {
		access_token: 'mock_access_token',
		instance_url: 'https://test.salesforce.com',
		id: 'https://login.salesforce.com/id/123',
		token_type: 'Bearer',
		issued_at: '1234567890',
		signature: 'mock_signature',
	};

	const mockPaymentDisputeRecord = {
		attributes: {
			type: 'Payment_Dispute__c',
		},
		Dispute_ID__c: 'du_test123',
		Amount__c: 100,
		Reason__c: 'fraudulent',
		Status__c: 'needs_response',
		Created_Date__c: '2025-08-21T12:31:22.000Z',
		Is_Charge_Refundable__c: true,
		Payment_Intent_ID__c: 'pi_test123',
		Evidence_Due_Date__c: '2025-08-28',
		Has_Evidence__c: false,
		Network_Reason_Code__c: '4855',
		Charge_ID__c: 'ch_test123',
		SubscriptionNumber__c: '',
		PaymentId__c: '',
		Billing_AccountId__c: '',
		InvoiceId__c: '',
	};

	const mockUpsertResponse = {
		id: 'sf_record_123',
		success: true,
		errors: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();

		const { getSecretValue } = require('@modules/secrets-manager/getSecret');
		getSecretValue.mockResolvedValue(mockSalesforceCredentials);

		const {
			authenticateWithSalesforce,
		} = require('../../src/services/salesforceAuth');
		authenticateWithSalesforce.mockResolvedValue(mockSalesforceAuth);

		const { mapStripeDisputeToSalesforce } = require('../../src/mappers');
		mapStripeDisputeToSalesforce.mockReturnValue(mockPaymentDisputeRecord);

		const {
			upsertPaymentDisputeInSalesforce,
		} = require('../../src/services/salesforceCreate');
		upsertPaymentDisputeInSalesforce.mockResolvedValue(mockUpsertResponse);
	});

	it('should successfully upsert salesforce object', async () => {
		const result = await upsertSalesforceObject(mockLogger, mockWebhookData);

		const { getSecretValue } = require('@modules/secrets-manager/getSecret');
		expect(getSecretValue).toHaveBeenCalledWith(
			'TEST/Salesforce/ConnectedApp/StripeDisputeWebhooks',
		);

		const {
			authenticateWithSalesforce,
		} = require('../../src/services/salesforceAuth');
		expect(authenticateWithSalesforce).toHaveBeenCalledWith(
			mockLogger,
			mockSalesforceCredentials,
		);

		const { mapStripeDisputeToSalesforce } = require('../../src/mappers');
		expect(mapStripeDisputeToSalesforce).toHaveBeenCalledWith(
			mockWebhookData,
			undefined,
		);

		const {
			upsertPaymentDisputeInSalesforce,
		} = require('../../src/services/salesforceCreate');
		expect(upsertPaymentDisputeInSalesforce).toHaveBeenCalledWith(
			mockSalesforceAuth,
			mockPaymentDisputeRecord,
			mockLogger,
		);

		expect(result).toEqual(mockUpsertResponse);
	});

	it('should handle getSecretValue error', async () => {
		const { getSecretValue } = require('@modules/secrets-manager/getSecret');
		getSecretValue.mockRejectedValue(new Error('Secret not found'));

		await expect(
			upsertSalesforceObject(mockLogger, mockWebhookData),
		).rejects.toThrow('Secret not found');
	});

	it('should handle authentication error', async () => {
		const {
			authenticateWithSalesforce,
		} = require('../../src/services/salesforceAuth');
		authenticateWithSalesforce.mockRejectedValue(new Error('Auth failed'));

		await expect(
			upsertSalesforceObject(mockLogger, mockWebhookData),
		).rejects.toThrow('Auth failed');
	});

	it('should handle upsert error', async () => {
		const {
			upsertPaymentDisputeInSalesforce,
		} = require('../../src/services/salesforceCreate');
		upsertPaymentDisputeInSalesforce.mockRejectedValue(
			new Error('Upsert failed'),
		);

		await expect(
			upsertSalesforceObject(mockLogger, mockWebhookData),
		).rejects.toThrow('Upsert failed');
	});

	it('should successfully upsert with Zuora data', async () => {
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

		const result = await upsertSalesforceObject(
			mockLogger,
			mockWebhookData,
			mockZuoraData,
		);

		const { mapStripeDisputeToSalesforce } = require('../../src/mappers');
		expect(mapStripeDisputeToSalesforce).toHaveBeenCalledWith(
			mockWebhookData,
			mockZuoraData,
		);

		expect(result).toEqual(mockUpsertResponse);
	});

	it('should handle dispute closed webhook', async () => {
		const mockClosedWebhookData: ListenDisputeClosedRequestBody = {
			id: 'evt_closed123',
			type: 'charge.dispute.closed',
			data: {
				object: {
					id: 'du_closed123',
					charge: 'ch_closed123',
					amount: 5000,
					currency: 'usd',
					reason: 'fraudulent',
					status: 'closed',
					created: 1755775482,
					is_charge_refundable: false,
					payment_intent: 'pi_closed123',
					evidence_details: {
						due_by: 1756511999,
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

		const result = await upsertSalesforceObject(
			mockLogger,
			mockClosedWebhookData,
		);

		const { mapStripeDisputeToSalesforce } = require('../../src/mappers');
		expect(mapStripeDisputeToSalesforce).toHaveBeenCalledWith(
			mockClosedWebhookData,
			undefined,
		);

		expect(result).toEqual(mockUpsertResponse);
	});
});
