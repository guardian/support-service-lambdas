import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import { createPayment, rejectPayment } from '../src/payment';
import dayjs from 'dayjs';

jest.mock('@modules/zuora/zuoraClient');

describe('payment', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createPayment', () => {
		it('should create payment successfully', async () => {
			const mockResponse = { Success: true, Id: 'payment_123' };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);
			const effectiveDate = dayjs('2023-11-04');

			await createPayment(
				mockZuoraClient,
				'invoice_123',
				99.99,
				'account_456',
				'payment_method_789',
				effectiveDate,
			);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/payment',
				expect.stringContaining('"EffectiveDate":"2023-11-04"'),
				expect.any(Object),
			);
		});

		it('should throw error when payment creation fails', async () => {
			const mockResponse = { Success: false, errors: ['Payment failed'] };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);
			const effectiveDate = dayjs('2023-11-04');

			await expect(
				createPayment(
					mockZuoraClient,
					'invoice_123',
					99.99,
					'account_456',
					'payment_method_789',
					effectiveDate,
				),
			).rejects.toThrow('An error occurred while creating the payment');
		});

		it('should handle API errors', async () => {
			const error = new Error('Zuora API error');
			mockZuoraClient.post = jest.fn().mockRejectedValue(error);
			const effectiveDate = dayjs('2023-11-04');

			await expect(
				createPayment(
					mockZuoraClient,
					'invoice_123',
					99.99,
					'account_456',
					'payment_method_789',
					effectiveDate,
				),
			).rejects.toThrow('Zuora API error');
		});
	});

	describe('rejectPayment', () => {
		it('should reject payment with default chargeback reason', async () => {
			const mockResponse = { Success: true, Id: 'rejection_123' };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const result = await rejectPayment(mockZuoraClient, 'P-12345');

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/gateway-settlement/payments/P-12345/reject',
				JSON.stringify({
					gatewayReconciliationStatus: 'payment_failed',
					gatewayReconciliationReason: 'chargeback',
					gatewayResponse: 'Payment disputed - chargeback received',
					gatewayResponseCode: '4855',
				}),
				expect.any(Object),
			);

			expect(result).toEqual(mockResponse);
		});

		it('should reject payment with custom reason', async () => {
			const mockResponse = { Success: true };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			await rejectPayment(mockZuoraClient, 'P-67890', 'insufficient_funds');

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/gateway-settlement/payments/P-67890/reject',
				expect.stringContaining('insufficient_funds'),
				expect.any(Object),
			);

			const callArgs = (mockZuoraClient.post as jest.Mock).mock.calls[0];
			const requestBody = JSON.parse(callArgs[1] as string);
			expect(requestBody.gatewayReconciliationReason).toBe('insufficient_funds');
		});

		it('should handle different payment numbers', async () => {
			const mockResponse = { Success: true };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			await rejectPayment(
				mockZuoraClient,
				'8a8082c17f2b9b24017f2b9b3b4e0015',
				'fraud',
			);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/gateway-settlement/payments/8a8082c17f2b9b24017f2b9b3b4e0015/reject',
				expect.any(String),
				expect.any(Object),
			);
		});

		it('should handle Zuora API errors', async () => {
			const error = new Error('Payment not found');
			mockZuoraClient.post = jest.fn().mockRejectedValue(error);

			await expect(rejectPayment(mockZuoraClient, 'P-12345')).rejects.toThrow(
				'Payment not found',
			);
		});

		it('should include all required fields in request body', async () => {
			mockZuoraClient.post = jest.fn().mockResolvedValue({ Success: true });

			await rejectPayment(mockZuoraClient, 'P-12345', 'fraud');

			const callArgs = (mockZuoraClient.post as jest.Mock).mock.calls[0];
			const requestBody = JSON.parse(callArgs[1] as string);

			expect(requestBody).toHaveProperty(
				'gatewayReconciliationStatus',
				'payment_failed',
			);
			expect(requestBody).toHaveProperty('gatewayReconciliationReason', 'fraud');
			expect(requestBody).toHaveProperty(
				'gatewayResponse',
				'Payment disputed - chargeback received',
			);
			expect(requestBody).toHaveProperty('gatewayResponseCode', '4855');
		});
	});
});