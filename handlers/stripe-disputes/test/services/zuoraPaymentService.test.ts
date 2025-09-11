import { rejectPayment } from '@modules/zuora/payment';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

describe('ZuoraPaymentService', () => {
	const mockZuoraClient = {
		post: jest.fn(),
	} as unknown as ZuoraClient;

	beforeEach(() => {
		jest.clearAllMocks();
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
		});

		it('should handle Zuora API errors', async () => {
			const error = new Error('Zuora API error');
			mockZuoraClient.post = jest.fn().mockRejectedValue(error);

			await expect(rejectPayment(mockZuoraClient, 'P-12345')).rejects.toThrow(
				'Zuora API error',
			);
		});
	});
});
