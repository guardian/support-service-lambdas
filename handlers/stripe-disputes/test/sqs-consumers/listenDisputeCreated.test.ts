import type { Logger } from '@modules/logger';
import type { ListenDisputeCreatedRequestBody } from '../../src/dtos';
import { upsertSalesforceObject } from '../../src/services/upsertSalesforceObject';
import { handleListenDisputeCreated } from '../../src/sqs-consumers/listenDisputeCreated';
import type { SalesforceUpsertResponse } from '../../src/types';

jest.mock('../../src/services/upsertSalesforceObject', () => ({
	upsertSalesforceObject: jest.fn(),
}));
const mockUpsertSalesforceObject =
	upsertSalesforceObject as jest.MockedFunction<typeof upsertSalesforceObject>;

describe('handleListenDisputeCreated', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		error: jest.fn(),
		mutableAddContext: jest.fn(),
		addContext: jest.fn(),
	} as any;

	const mockWebhookData: ListenDisputeCreatedRequestBody = {
		id: 'evt_test123',
		type: 'charge.dispute.created',
		data: {
			object: {
				id: 'du_test123',
				charge: 'ch_test123',
				amount: 5000,
				currency: 'usd',
				reason: 'fraudulent',
				status: 'warning_needs_response',
				created: 1699123456,
				is_charge_refundable: true,
				payment_intent: 'pi_test123',
				evidence_details: {
					due_by: 1699900800,
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

	const mockSalesforceResponse: SalesforceUpsertResponse = {
		id: 'sf_test123',
		success: true,
		errors: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockUpsertSalesforceObject.mockResolvedValue(mockSalesforceResponse);
	});

	describe('successful processing', () => {
		it('should process dispute created event successfully', async () => {
			const result = await handleListenDisputeCreated(
				mockLogger,
				mockWebhookData,
				'du_test123',
			);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute creation for dispute du_test123',
			);
			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				mockWebhookData,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Salesforce upsert response for dispute creation:',
				JSON.stringify(mockSalesforceResponse),
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Successfully processed dispute creation for dispute du_test123',
			);
			expect(result).toEqual(mockSalesforceResponse);
		});

		it('should log all processing steps', async () => {
			await handleListenDisputeCreated(
				mockLogger,
				mockWebhookData,
				'du_test123',
			);

			expect(mockLogger.log).toHaveBeenCalledTimes(3);
			expect(mockLogger.log).toHaveBeenNthCalledWith(
				1,
				'Processing dispute creation for dispute du_test123',
			);
			expect(mockLogger.log).toHaveBeenNthCalledWith(
				2,
				'Salesforce upsert response for dispute creation:',
				JSON.stringify(mockSalesforceResponse),
			);
			expect(mockLogger.log).toHaveBeenNthCalledWith(
				3,
				'Successfully processed dispute creation for dispute du_test123',
			);
		});
	});

	describe('error handling', () => {
		it('should propagate errors from upsertSalesforceObject', async () => {
			const error = new Error('Salesforce API error');
			mockUpsertSalesforceObject.mockRejectedValue(error);

			await expect(
				handleListenDisputeCreated(mockLogger, mockWebhookData, 'du_test123'),
			).rejects.toThrow('Salesforce API error');

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute creation for dispute du_test123',
			);
			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				mockWebhookData,
			);
			// Should not log success messages if error occurs
			expect(mockLogger.log).not.toHaveBeenCalledWith(
				expect.stringContaining('Salesforce upsert response'),
			);
			expect(mockLogger.log).not.toHaveBeenCalledWith(
				expect.stringContaining('Successfully processed'),
			);
		});
	});

	describe('different dispute scenarios', () => {
		it('should handle different dispute reasons', async () => {
			const differentDisputeData = {
				...mockWebhookData,
				data: {
					...mockWebhookData.data,
					object: {
						...mockWebhookData.data.object,
						reason: 'subscription_canceled',
						network_reason_code: '4863',
					},
				},
			};

			const result = await handleListenDisputeCreated(
				mockLogger,
				differentDisputeData,
				'du_different123',
			);

			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				differentDisputeData,
			);
			expect(result).toEqual(mockSalesforceResponse);
		});

		it('should handle different dispute amounts', async () => {
			const highAmountDisputeData = {
				...mockWebhookData,
				data: {
					...mockWebhookData.data,
					object: {
						...mockWebhookData.data.object,
						id: 'du_highamount123',
						amount: 50000, // $500.00
					},
				},
			};

			const result = await handleListenDisputeCreated(
				mockLogger,
				highAmountDisputeData,
				'du_highamount123',
			);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute creation for dispute du_highamount123',
			);
			expect(result).toEqual(mockSalesforceResponse);
		});
	});

	describe('integration points', () => {
		it('should pass correct parameters to upsertSalesforceObject', async () => {
			await handleListenDisputeCreated(
				mockLogger,
				mockWebhookData,
				'du_test123',
			);

			expect(mockUpsertSalesforceObject).toHaveBeenCalledTimes(1);
			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				mockWebhookData,
			);
		});

		it('should return the response from upsertSalesforceObject', async () => {
			const customResponse: SalesforceUpsertResponse = {
				id: 'custom_sf_id',
				success: true,
				errors: [],
			};
			mockUpsertSalesforceObject.mockResolvedValue(customResponse);

			const result = await handleListenDisputeCreated(
				mockLogger,
				mockWebhookData,
				'du_test123',
			);

			expect(result).toEqual(customResponse);
		});
	});
});
