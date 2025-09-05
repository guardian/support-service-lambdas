import type { Logger } from '@modules/logger';
import type { ListenDisputeClosedRequestBody } from '../../src/dtos';
import { upsertSalesforceObject } from '../../src/services/upsertSalesforceObject';
import { handleListenDisputeClosed } from '../../src/sqs-consumers/listenDisputeClosed';
import type { SalesforceUpsertResponse } from '../../src/types';

jest.mock('../../src/services/upsertSalesforceObject', () => ({
	upsertSalesforceObject: jest.fn(),
}));
const mockUpsertSalesforceObject =
	upsertSalesforceObject as jest.MockedFunction<typeof upsertSalesforceObject>;

describe('handleListenDisputeClosed', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		error: jest.fn(),
		mutableAddContext: jest.fn(),
		addContext: jest.fn(),
	} as any;

	const mockWebhookData: ListenDisputeClosedRequestBody = {
		id: 'evt_test456',
		type: 'charge.dispute.closed',
		data: {
			object: {
				id: 'du_test456',
				charge: 'ch_test456',
				amount: 3000,
				currency: 'usd',
				reason: 'fraudulent',
				status: 'lost',
				created: 1699123456,
				is_charge_refundable: false,
				payment_intent: 'pi_test456',
				evidence_details: {
					due_by: 1699900800,
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

	const mockSalesforceResponse: SalesforceUpsertResponse = {
		id: 'sf_test456',
		success: true,
		errors: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockUpsertSalesforceObject.mockResolvedValue(mockSalesforceResponse);
	});

	describe('successful processing', () => {
		it('should process dispute closed event successfully', async () => {
			const result = await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute closure for dispute du_test456',
			);
			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				mockWebhookData,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Salesforce upsert response for dispute closure:',
				JSON.stringify(mockSalesforceResponse),
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Successfully processed dispute closure for dispute du_test456',
			);
			expect(result).toEqual(mockSalesforceResponse);
		});

		it('should log all processing steps', async () => {
			await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(mockLogger.log).toHaveBeenCalledTimes(3);
			expect(mockLogger.log).toHaveBeenNthCalledWith(
				1,
				'Processing dispute closure for dispute du_test456',
			);
			expect(mockLogger.log).toHaveBeenNthCalledWith(
				2,
				'Salesforce upsert response for dispute closure:',
				JSON.stringify(mockSalesforceResponse),
			);
			expect(mockLogger.log).toHaveBeenNthCalledWith(
				3,
				'Successfully processed dispute closure for dispute du_test456',
			);
		});
	});

	describe('error handling', () => {
		it('should propagate errors from upsertSalesforceObject', async () => {
			const error = new Error('Salesforce connection timeout');
			mockUpsertSalesforceObject.mockRejectedValue(error);

			await expect(
				handleListenDisputeClosed(mockLogger, mockWebhookData, 'du_test456'),
			).rejects.toThrow('Salesforce connection timeout');

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute closure for dispute du_test456',
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

	describe('different dispute closure scenarios', () => {
		it('should handle won disputes', async () => {
			const wonDisputeData = {
				...mockWebhookData,
				data: {
					...mockWebhookData.data,
					object: {
						...mockWebhookData.data.object,
						id: 'du_won123',
						status: 'won',
						is_charge_refundable: true,
					},
				},
			};

			const result = await handleListenDisputeClosed(
				mockLogger,
				wonDisputeData,
				'du_won123',
			);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute closure for dispute du_won123',
			);
			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				wonDisputeData,
			);
			expect(result).toEqual(mockSalesforceResponse);
		});

		it('should handle lost disputes', async () => {
			const lostDisputeData = {
				...mockWebhookData,
				data: {
					...mockWebhookData.data,
					object: {
						...mockWebhookData.data.object,
						id: 'du_lost123',
						status: 'lost',
						is_charge_refundable: false,
					},
				},
			};

			const result = await handleListenDisputeClosed(
				mockLogger,
				lostDisputeData,
				'du_lost123',
			);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute closure for dispute du_lost123',
			);
			expect(result).toEqual(mockSalesforceResponse);
		});

		it('should handle different closure reasons', async () => {
			const differentReasonData = {
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

			const result = await handleListenDisputeClosed(
				mockLogger,
				differentReasonData,
				'du_test456',
			);

			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				differentReasonData,
			);
			expect(result).toEqual(mockSalesforceResponse);
		});
	});

	describe('integration points', () => {
		it('should pass correct parameters to upsertSalesforceObject', async () => {
			await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(mockUpsertSalesforceObject).toHaveBeenCalledTimes(1);
			expect(mockUpsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				mockWebhookData,
			);
		});

		it('should return the response from upsertSalesforceObject', async () => {
			const customResponse: SalesforceUpsertResponse = {
				id: 'custom_sf_closed_id',
				success: true,
				errors: [],
			};
			mockUpsertSalesforceObject.mockResolvedValue(customResponse);

			const result = await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(result).toEqual(customResponse);
		});
	});

	describe('future extensibility', () => {
		it('should be ready for closure-specific logic extension', async () => {
			// This test documents the current behavior and ensures
			// the function structure supports future enhancements
			await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			// Current behavior: only calls upsertSalesforceObject
			expect(mockUpsertSalesforceObject).toHaveBeenCalledTimes(1);

			// Future: Could add cleanup operations, notifications, etc.
			// The function signature and structure are ready for such additions
		});
	});
});
