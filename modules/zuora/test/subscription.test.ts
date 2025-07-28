// import dayjs from 'dayjs';
import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import {
	// cancelSubscription,
	// getSubscription,
	getSubscriptionsByAccountNumber,
} from '@modules/zuora/subscription';

import type {
	ZuoraSubscription,
	ZuoraSubscriptionsFromAccountResponse,
	// ZuoraSuccessResponse,
} from '@modules/zuora/zuoraSchemas';
import {
	// zuoraSubscriptionResponseSchema,
	zuoraSubscriptionsFromAccountSchema,
	// zuoraSuccessResponseSchema,
} from '@modules/zuora/zuoraSchemas';

jest.mock('@modules/zuora/zuoraClient');

describe('subscription', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// describe('cancelSubscription', () => {
	// 	it('should cancel subscription with correct parameters', async () => {
	// 		const mockResponse: ZuoraSuccessResponse = {
	// 			success: true,
	// 		};

	// 		mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

	// 		const contractEffectiveDate = dayjs('2025-08-01');
	// 		const result = await cancelSubscription(
	// 			mockZuoraClient,
	// 			'SUB-12345',
	// 			contractEffectiveDate,
	// 			true,
	// 			false,
	// 		);

	// 		expect(mockZuoraClient.put).toHaveBeenCalledWith(
	// 			'/v1/subscriptions/SUB-12345/cancel',
	// 			JSON.stringify({
	// 				cancellationEffectiveDate: '2025-08-01',
	// 				cancellationPolicy: 'SpecificDate',
	// 				runBilling: true,
	// 				collect: false,
	// 			}),
	// 			zuoraSuccessResponseSchema,
	// 			{ 'zuora-version': '211.0' },
	// 		);
	// 		expect(result).toEqual(mockResponse);
	// 	});

	// 	it('should handle undefined collect parameter', async () => {
	// 		const mockResponse: ZuoraSuccessResponse = {
	// 			success: true,
	// 		};

	// 		mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

	// 		const contractEffectiveDate = dayjs('2025-08-01');
	// 		await cancelSubscription(
	// 			mockZuoraClient,
	// 			'SUB-12345',
	// 			contractEffectiveDate,
	// 			false,
	// 		);

	// 		expect(mockZuoraClient.put).toHaveBeenCalledWith(
	// 			'/v1/subscriptions/SUB-12345/cancel',
	// 			JSON.stringify({
	// 				cancellationEffectiveDate: '2025-08-01',
	// 				cancellationPolicy: 'SpecificDate',
	// 				runBilling: false,
	// 				collect: undefined,
	// 			}),
	// 			zuoraSuccessResponseSchema,
	// 			{ 'zuora-version': '211.0' },
	// 		);
	// 	});

	// 	it('should throw if zuoraClient.put rejects', async () => {
	// 		const error = new Error('Cancellation failed');
	// 		mockZuoraClient.put = jest.fn().mockRejectedValue(error);

	// 		const contractEffectiveDate = dayjs('2025-08-01');

	// 		await expect(
	// 			cancelSubscription(
	// 				mockZuoraClient,
	// 				'SUB-12345',
	// 				contractEffectiveDate,
	// 				true,
	// 			),
	// 		).rejects.toThrow('Cancellation failed');
	// 	});
	// });

	// describe('getSubscription', () => {
	// 	it('should get subscription by subscription number', async () => {
	// 		const mockSubscription: ZuoraSubscription = {
	// 			id: 'abc123',
	// 			accountNumber: 'ACC-67890',
	// 			status: 'Active',
	// 			termStartDate: new Date('2025-01-01'),
	// 			termEndDate: new Date('2026-01-01'),
	// 			ratePlans: [],
	// 			subscriptionNumber: 'SUB-12345',
	// 			contractEffectiveDate: new Date('2023-07-03'),
	// 			serviceActivationDate: new Date('2023-07-03'),
	// 			customerAcceptanceDate: new Date('2023-07-03'),
	// 			subscriptionStartDate: new Date('2023-07-03'),
	// 			subscriptionEndDate: new Date('2024-07-03'),
	// 			lastBookingDate: new Date('2024-07-03'),
	// 		};
	// 		mockZuoraClient.get = jest.fn().mockResolvedValue(mockSubscription);

	// 		const result = await getSubscription(mockZuoraClient, 'SUB-12345');

	// 		expect(mockZuoraClient.get).toHaveBeenCalledWith(
	// 			'v1/subscriptions/SUB-12345',
	// 			zuoraSubscriptionResponseSchema,
	// 		);
	// 		expect(result).toEqual(mockSubscription);
	// 	});

	// 	it('should throw if zuoraClient.get rejects', async () => {
	// 		const error = new Error('Subscription not found');
	// 		mockZuoraClient.get = jest.fn().mockRejectedValue(error);

	// 		await expect(
	// 			getSubscription(mockZuoraClient, 'SUB-INVALID'),
	// 		).rejects.toThrow('Subscription not found');
	// 	});
	// });

	describe('getSubscriptionsByAccountNumber', () => {
		it('should get subscriptions by account number', async () => {
			const mockSubscriptions: ZuoraSubscription[] = [
				{
					id: 'abc123',
					accountNumber: 'ACC-67890',
					status: 'Active',
					termStartDate: new Date('2025-01-01'),
					termEndDate: new Date('2026-01-01'),
					ratePlans: [],
					subscriptionNumber: 'SUB-12345',
					contractEffectiveDate: new Date('2025-01-01'),
					serviceActivationDate: new Date('2025-01-01'),
					customerAcceptanceDate: new Date('2025-01-01'),
					subscriptionStartDate: new Date('2025-01-01'),
					subscriptionEndDate: new Date('2026-01-01'),
					lastBookingDate: new Date('2026-01-01'),
				},
				{
					id: 'def456',
					accountNumber: 'ACC-67890',
					status: 'Active',
					termStartDate: new Date('2025-01-01'),
					termEndDate: new Date('2026-01-01'),
					ratePlans: [],
					subscriptionNumber: 'SUB-54321',
					contractEffectiveDate: new Date('2025-02-01'),
					serviceActivationDate: new Date('2025-02-01'),
					customerAcceptanceDate: new Date('2025-02-01'),
					subscriptionStartDate: new Date('2025-02-01'),
					subscriptionEndDate: new Date('2026-02-01'),
					lastBookingDate: new Date('2026-02-01'),
				},
			];

			const mockResponse: ZuoraSubscriptionsFromAccountResponse = {
				subscriptions: mockSubscriptions,
				success: true,
			};

			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const result = await getSubscriptionsByAccountNumber(
				mockZuoraClient,
				'ACC-67890',
			);

			expect(mockZuoraClient.get).toHaveBeenCalledWith(
				'v1/subscriptions/accounts/ACC-67890',
				zuoraSubscriptionsFromAccountSchema,
			);
			expect(result).toEqual(mockSubscriptions);
		});

		// it('should return empty array when no subscriptions found', async () => {
		// 	const mockResponse: ZuoraSubscriptionsFromAccountResponse = {
		// 		success: false,
		// 	};
		// 	//does the endpoint return false?
		// 	mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

		// 	const result = await getSubscriptionsByAccountNumber(
		// 		mockZuoraClient,
		// 		'ACC-EMPTY',
		// 	);

		// 	expect(result).toEqual([]);
		// });

		it('returns the response from zuoraClient.get', async () => {
			const mockResponse: ZuoraSubscriptionsFromAccountResponse = {
				success: false,
				reasons: [
					{
						code: 50000040,
						message: "Cannot find entity by key: 'A-S009327871'.",
					},
				],
				requestId: '610ddeec-c9dc-405e-88d1-1ba9ed912af5',
			};

			mockGet.mockResolvedValue(mockResponse);

			const result = await getPaymentMethods(mockZuoraClient, accountId);

			expect(result).toBe(mockResponse);
		});

		it('propagates errors from zuoraClient.get', async () => {
			const error = new Error('fail');
			mockGet.mockRejectedValue(error);

			await expect(
				getPaymentMethods(mockZuoraClient, accountId),
			).rejects.toThrow('fail');
		});

		it('should throw if zuoraClient.get rejects', async () => {
			const error = new Error('Account not found');
			mockZuoraClient.get = jest.fn().mockRejectedValue(error);

			await expect(
				getSubscriptionsByAccountNumber(mockZuoraClient, 'ACC-INVALID'),
			).rejects.toThrow('Account not found');
		});
	});
});
