import dayjs from 'dayjs';
import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import {
	cancelSubscription,
	getSubscription,
	getSubscriptionsByAccountNumber,
} from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '../../../modules/zuora/src/types/objects/subscription';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSubscriptionResponseSchema } from '../../../modules/zuora/src/types/objects/subscription';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';
import { zuoraSubscriptionsFromAccountSchema } from '../../../modules/zuora/src/types/objects/account';
import type { ZuoraSubscriptionsFromAccountResponse } from '../../../modules/zuora/src/types/objects/account';

jest.mock('@modules/zuora/zuoraClient');

describe('subscription', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('cancelSubscription', () => {
		it('should cancel subscription with correct parameters', async () => {
			const mockResponse: ZuoraSuccessResponse = {
				success: true,
			};

			mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

			const contractEffectiveDate = dayjs('2025-08-01');
			const result = await cancelSubscription(
				mockZuoraClient,
				'SUB-12345',
				contractEffectiveDate,
				true,
				false,
			);

			expect(mockZuoraClient.put).toHaveBeenCalledWith(
				'/v1/subscriptions/SUB-12345/cancel',
				JSON.stringify({
					cancellationEffectiveDate: '2025-08-01',
					cancellationPolicy: 'SpecificDate',
					runBilling: true,
					collect: false,
				}),
				zuoraSuccessResponseSchema,
				{ 'zuora-version': '211.0' },
			);
			expect(result).toEqual(mockResponse);
		});

		it('should handle undefined collect parameter', async () => {
			const mockResponse: ZuoraSuccessResponse = {
				success: true,
			};

			mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

			const contractEffectiveDate = dayjs('2025-08-02');
			await cancelSubscription(
				mockZuoraClient,
				'SUB-12345',
				contractEffectiveDate,
				false,
			);

			expect(mockZuoraClient.put).toHaveBeenCalledWith(
				'/v1/subscriptions/SUB-12345/cancel',
				JSON.stringify({
					cancellationEffectiveDate: '2025-08-02',
					cancellationPolicy: 'SpecificDate',
					runBilling: false,
					collect: undefined,
				}),
				zuoraSuccessResponseSchema,
				{ 'zuora-version': '211.0' },
			);
		});

		it('should throw if zuoraClient.put rejects', async () => {
			const error = new Error('Cancellation failed');
			mockZuoraClient.put = jest.fn().mockRejectedValue(error);

			const contractEffectiveDate = dayjs('2025-08-01');

			await expect(
				cancelSubscription(
					mockZuoraClient,
					'SUB-12345',
					contractEffectiveDate,
					true,
				),
			).rejects.toThrow('Cancellation failed');
		});
	});

	describe('getSubscription', () => {
		it('should get subscription by subscription number', async () => {
			const mockSubscription: ZuoraSubscription = {
				id: 'abc123',
				accountNumber: 'ACC-67890',
				status: 'Active',
				termStartDate: new Date('2025-01-01'),
				termEndDate: new Date('2026-01-01'),
				ratePlans: [],
				subscriptionNumber: 'SUB-12345',
				contractEffectiveDate: new Date('2023-07-03'),
				serviceActivationDate: new Date('2023-07-03'),
				customerAcceptanceDate: new Date('2023-07-03'),
				subscriptionStartDate: new Date('2023-07-03'),
				subscriptionEndDate: new Date('2024-07-03'),
				lastBookingDate: new Date('2024-07-03'),
			};
			mockZuoraClient.get = jest.fn().mockResolvedValue(mockSubscription);

			const result = await getSubscription(mockZuoraClient, 'SUB-12345');

			expect(mockZuoraClient.get).toHaveBeenCalledWith(
				'v1/subscriptions/SUB-12345',
				zuoraSubscriptionResponseSchema,
			);
			expect(result).toEqual(mockSubscription);
		});

		it('should throw if zuoraClient.get rejects', async () => {
			const error = new Error('Subscription not found');
			mockZuoraClient.get = jest.fn().mockRejectedValue(error);

			await expect(
				getSubscription(mockZuoraClient, 'SUB-INVALID'),
			).rejects.toThrow('Subscription not found');
		});
	});

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

		it('should return empty array when no subscriptions in response', async () => {
			const mockResponse: ZuoraSubscriptionsFromAccountResponse = {
				success: false,
				reasons: [
					{
						code: 50000040,
						message:
							"Cannot find entity by key: '8ad09b7d83a313110183a8769afd1bf31'.",
					},
				],
			};
			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const result = await getSubscriptionsByAccountNumber(
				mockZuoraClient,
				'ACC-EMPTY',
			);

			expect(result).toEqual([]);
		});

		it('returns the response from zuoraClient.get', async () => {
			const mockResponse: ZuoraSubscriptionsFromAccountResponse = {
				subscriptions: [
					{
						id: '8ad0887183a3024f0183a899d0434b41',
						accountNumber: 'A00422866',
						subscriptionNumber: 'A-S00430438',
						contractEffectiveDate: new Date('2022-10-01'),
						serviceActivationDate: new Date('2022-10-01'),
						customerAcceptanceDate: new Date('2022-10-01'),
						subscriptionStartDate: new Date('2022-10-01'),
						subscriptionEndDate: new Date('2022-10-07'),
						lastBookingDate: new Date('2022-10-05'),
						termStartDate: new Date('2022-10-01'),
						termEndDate: new Date('2022-10-07'),
						status: 'Cancelled',
						ratePlans: [
							{
								id: '8ad0887183a3024f0183a899d0464b43',
								productId: '2c92c0f955c3cf0f0155c5d9ddc53bc3',
								productName: 'Newspaper Delivery',
								productRatePlanId: '2c92c0f955c3cf0f0155c5d9e2493c43',
								ratePlanName: 'Everyday',
								ratePlanCharges: [
									{
										id: '8ad0887183a3024f0183a899d0504b52',
										productRatePlanChargeId: '2c92c0f955c3cf0f0155c5d9e4993c75',
										number: 'C-00715453',
										name: 'Sunday',
										type: 'Recurring',
										model: 'FlatFee',
										billingPeriod: 'Month',
										currency: 'GBP',
										effectiveStartDate: new Date('2022-10-01'),
										effectiveEndDate: new Date('2022-10-07'),
										processedThroughDate: new Date('2022-10-07'),
										chargedThroughDate: new Date('2022-10-07'),
										upToPeriodsType: null,
										upToPeriods: null,
										price: 12.57,
										discountPercentage: null,
									},
								],
							},
						],
					},
				],
			};

			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const result = await getSubscriptionsByAccountNumber(
				mockZuoraClient,
				'ACC-67890',
			);

			expect(result).toBe(mockResponse.subscriptions);
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
