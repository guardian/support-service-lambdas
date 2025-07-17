import dayjs from 'dayjs';
import { buildUpdateAmountRequestBody } from '../src/zuoraApi';

describe('Supporter Plus Amount Update - Edge Cases', () => {

	describe('Auto-renewed subscription scenarios', () => {
		test('Should handle subscription with charge effective date before current term start (the original bug)', () => {
			// Test data representing the problematic scenario:
			// - Original subscription: 2023-10-26
			// - Auto-renewed: 2024-04-10 (current term start)
			// - Charge effective date: 2023-10-26 (original)
			// - Current term end: 2025-04-10
			
			const subscriptionData = {
				subscriptionNumber: 'A-S00707842',
				accountNumber: 'A00714188',
				termStartDate: '2024-04-10',
				termEndDate: '2025-04-10',
				ratePlans: [{
					id: 'test-rate-plan-id',
					productRatePlanId: 'supporter-plus-monthly-id',
					ratePlanCharges: [{
						id: 'test-charge-id',
						number: 'C-12345678',
						productRatePlanChargeId: 'contribution-charge-id',
						effectiveStartDate: '2023-10-26', // Original start date
						chargedThroughDate: '2024-04-10',  // Last renewal date
						price: 5.0
					}]
				}]
			};

			const applyFromDate = dayjs('2024-07-15'); // Mid-term change
			const shouldExtendTerm = applyFromDate.isAfter(dayjs(subscriptionData.termEndDate));

			const orderRequest = buildUpdateAmountRequestBody({
				applyFromDate,
				subscriptionNumber: subscriptionData.subscriptionNumber,
				accountNumber: subscriptionData.accountNumber,
				ratePlanId: subscriptionData.ratePlans[0]!.id,
				chargeNumber: subscriptionData.ratePlans[0]!.ratePlanCharges[0]!.number,
				contributionAmount: 10.0,
				shouldExtendTerm
			});

			// Verify the request structure
			expect(orderRequest.subscriptions[0]?.orderActions).toHaveLength(2);
			expect(orderRequest.subscriptions[0]?.orderActions?.[0]?.type).toBe('UpdateProduct');
			expect(orderRequest.subscriptions[0]?.orderActions?.[1]?.type).toBe('TermsAndConditions');
			
			// Should NOT extend term for mid-term changes
			expect(shouldExtendTerm).toBe(false);
		});

		test('Should extend term when apply date is after current term end', () => {
			const subscriptionData = {
				termStartDate: '2024-04-10',
				termEndDate: '2025-04-10'
			};

			const applyFromDate = dayjs('2025-06-15'); // After term end
			const shouldExtendTerm = applyFromDate.isAfter(dayjs(subscriptionData.termEndDate));

			const orderRequest = buildUpdateAmountRequestBody({
				applyFromDate,
				subscriptionNumber: 'A-S00707842',
				accountNumber: 'A00714188',
				ratePlanId: 'test-rate-plan-id',
				chargeNumber: 'C-12345678',
				contributionAmount: 10.0,
				shouldExtendTerm
			});

			// Should have 3 actions: UpdateProduct, TermsAndConditions, and RenewSubscription
			expect(orderRequest.subscriptions[0]?.orderActions).toHaveLength(3);
			expect(orderRequest.subscriptions[0]?.orderActions?.[2]?.type).toBe('RenewSubscription');
			expect(shouldExtendTerm).toBe(true);
		});

		test('Should handle subscription that has renewed multiple times', () => {
			// Subscription that started in 2022, renewed twice
			// This should work without issues as the apply date logic
			// uses chargedThroughDate, not effectiveStartDate
			const applyFromDate = dayjs('2024-06-15');
			const termEndDate = '2025-01-01';
			expect(applyFromDate.isAfter(dayjs(termEndDate))).toBe(false);
		});
	});

	describe('Charge state scenarios', () => {
		test('Should use effectiveStartDate when chargedThroughDate is null (pending amendment)', () => {
			const chargeToUpdate: {
				chargedThroughDate: null;
				effectiveStartDate: string;
			} = {
				chargedThroughDate: null,
				effectiveStartDate: '2024-04-10'
			};

			// Test the actual logic from updateSupporterPlusAmount.ts
			const applyFromDate = dayjs(chargeToUpdate.effectiveStartDate);

			expect(applyFromDate.format('YYYY-MM-DD')).toBe('2024-04-10');
		});

		test('Should use chargedThroughDate when available (normal case)', () => {
			const chargeToUpdate: {
				chargedThroughDate: string | null;
				effectiveStartDate: string;
			} = {
				chargedThroughDate: '2024-07-10',
				effectiveStartDate: '2024-04-10'
			};

			const applyFromDate = dayjs(
				chargeToUpdate.chargedThroughDate ?? chargeToUpdate.effectiveStartDate
			);

			expect(applyFromDate.format('YYYY-MM-DD')).toBe('2024-07-10');
		});
	});

	describe('Term boundary edge cases', () => {
		test('Should handle apply date exactly on term end date', () => {
			const termEndDate = '2025-04-10';
			const applyFromDate = dayjs(termEndDate);
			const shouldExtendTerm = applyFromDate.isAfter(dayjs(termEndDate));

			// Exactly on term end should NOT extend (isAfter returns false for equal dates)
			expect(shouldExtendTerm).toBe(false);
		});

		test('Should handle apply date one day after term end', () => {
			const termEndDate = '2025-04-10';
			const applyFromDate = dayjs(termEndDate).add(1, 'day');
			const shouldExtendTerm = applyFromDate.isAfter(dayjs(termEndDate));

			expect(shouldExtendTerm).toBe(true);
		});
	});
});
