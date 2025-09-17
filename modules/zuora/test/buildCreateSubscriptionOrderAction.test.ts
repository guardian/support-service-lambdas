import { buildCreateSubscriptionOrderAction } from '../src/orders/orderActions';
import { Stage } from '@modules/stage';
import type { ValidatedPromotion } from '@modules/promotions/validatePromotion';
import dayjs from 'dayjs';
import { prettyLog } from '@modules/prettyPrint';

describe('buildCreateSubscriptionOrderAction', () => {
	const stage: Stage = 'CODE';
	const productRatePlanId = 'ratePlan123';
	const contractEffectiveDate = dayjs('2024-06-01');
	const customerAcceptanceDate = dayjs('2024-06-05');
	const termLengthInMonths = 6;
	const chargeOverride = {
		productRatePlanChargeId: 'charge123',
		overrideAmount: 42.5,
	};
	const validatedPromotion: ValidatedPromotion = {
		discountPercentage: 25,
		durationInMonths: 3,
		promoCode: 'PROMO25',
	};

	it('should build action without promotion or chargeOverride (Recurring)', () => {
		const result = buildCreateSubscriptionOrderAction({
			stage,
			productRatePlanId,
			contractEffectiveDate,
			customerAcceptanceDate,
			termType: 'Recurring',
			termLengthInMonths,
		});
		prettyLog(result);
		expect(result.type).toBe('CreateSubscription');
		expect(result.createSubscription.subscribeToRatePlans.length).toBe(1);
		expect(result.createSubscription.subscribeToRatePlans[0]).toMatchObject({
			productRatePlanId,
			chargeOverrides: [],
		});
		expect(result.createSubscription.terms.autoRenew).toBe(true);
		expect(result.createSubscription.terms.initialTerm.period).toBe(12);
		expect(result.createSubscription.terms.initialTerm.periodType).toBe(
			'Month',
		);
	});

	it('should build action with chargeOverride (Recurring)', () => {
		const result = buildCreateSubscriptionOrderAction({
			stage,
			productRatePlanId,
			contractEffectiveDate,
			customerAcceptanceDate,
			chargeOverride,
			termType: 'Recurring',
			termLengthInMonths,
		});
		expect(
			result.createSubscription.subscribeToRatePlans[0]?.chargeOverrides,
		).toEqual([
			{
				productRatePlanChargeId: chargeOverride.productRatePlanChargeId,
				pricing: {
					recurringFlatFee: {
						listPrice: chargeOverride.overrideAmount,
					},
				},
			},
		]);
	});

	it('should build action with promotion (Recurring)', () => {
		const result = buildCreateSubscriptionOrderAction({
			stage,
			productRatePlanId,
			contractEffectiveDate,
			customerAcceptanceDate,
			validatedPromotion,
			termType: 'Recurring',
			termLengthInMonths,
		});
		expect(result.createSubscription.subscribeToRatePlans.length).toBe(2);
		const discountPlan = result.createSubscription.subscribeToRatePlans[1];
		expect(discountPlan).toHaveProperty('productRatePlanId');
		expect(discountPlan).toHaveProperty('chargeOverrides');
		// expect(
		// 	discountPlan?.chargeOverrides?.[0]?.pricing.discount.discountPercentage,
		// ).toBe(validatedPromotion.discountPercentage);
		// expect(discountPlan.chargeOverrides[0].endDate).toEqual({
		// 	endDateCondition: 'Fixed_Period',
		// 	upToPeriods: validatedPromotion.durationInMonths,
		// 	upToPeriodsType: 'Months',
		// });
	});

	// it('should build action with promotion (OneTime)', () => {
	// 	const result = buildCreateSubscriptionOrderAction({
	// 		stage,
	// 		productRatePlanId,
	// 		contractEffectiveDate,
	// 		customerAcceptanceDate,
	// 		validatedPromotion,
	// 		termType: 'OneTime',
	// 		termLengthInMonths,
	// 	});
	// 	expect(result.createSubscription.terms.autoRenew).toBe(false);
	// 	expect(result.createSubscription.terms.initialTerm.periodType).toBe('Day');
	// 	expect(result.createSubscription.subscribeToRatePlans.length).toBe(2);
	// });

	// it('should build action with promotion without durationInMonths', () => {
	// 	const promo: ValidatedPromotion = {
	// 		discountPercentage: 10,
	// 		promoCode: 'PROMO10',
	// 	};
	// 	const result = buildCreateSubscriptionOrderAction({
	// 		stage,
	// 		productRatePlanId,
	// 		contractEffectiveDate,
	// 		customerAcceptanceDate,
	// 		validatedPromotion: promo,
	// 		termType: 'Recurring',
	// 		termLengthInMonths,
	// 	});
	// 	const discountPlan = result.createSubscription.subscribeToRatePlans[1];
	// 	expect(discountPlan?.chargeOverrides?.[0].endDate).toBeUndefined();
	// });
});
