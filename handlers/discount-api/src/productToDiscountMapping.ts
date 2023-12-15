import type { BillingPeriod } from '../../../modules/billingPeriod';
import type { Stage } from '../../../modules/stage';
import { checkDefined } from './nullAndUndefined';
import type { ZuoraSubscription } from './zuora/zuoraSchemas';

export const getDiscountProductRatePlanIdFromSubscription = (
	stage: Stage,
	subscription: ZuoraSubscription,
) => {
	const billingPeriod = checkDefined(
		subscription.ratePlans[0]?.ratePlanCharges[0]?.billingPeriod,
		`No billing period found on subscription ${subscription.subscriptionNumber}`,
	);
	return ProductToDiscountMapping[stage][billingPeriod]
		.discountProductRatePlanId;
};

export const getEligibleProductRatePlanIdsForDiscount = (
	discountProductRatePlanId: string,
) => {
	return Object.values(ProductToDiscountMapping)
		.flatMap((_) => Object.values(_))
		.filter((_) => _.discountProductRatePlanId === discountProductRatePlanId)
		.flatMap((_) => _.eligibleProductRatePlanIds);
};

type Discount = {
	discountProductRatePlanId: string;
	name: string;
	effectiveStartDate: string;
	effectiveEndDate: string;
	eligibleProductRatePlanIds: string[];
};
const ProductToDiscountMapping: {
	[K in Stage]: {
		[K in BillingPeriod]: Discount;
	};
} = {
	CODE: {
		Month: {
			discountProductRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			effectiveStartDate: '2018-04-01',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: [
				'2c92c0f84bbfec8b014bc655f4852d9d',
				'2c92c0f84bbfec58014bc6a2d43a1f5b',
			],
		},
		Quarter: {
			discountProductRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			effectiveStartDate: '2018-04-01',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: [
				'2c92c0f84bbfec8b014bc655f4852d9d',
				'2c92c0f84bbfec58014bc6a2d43a1f5b',
			],
		},
		Annual: {
			discountProductRatePlanId: '8ad08f068b5b9ca2018b5cadf0897ed3',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			effectiveStartDate: '2023-10-23',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: ['2c92c0f94bbffaaa014bc6a4212e205b'],
		},
	},
	PROD: {
		Month: {
			discountProductRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			effectiveStartDate: '2023-10-26',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: [
				'2c92a0fb4edd70c8014edeaa4eae220a',
				'2c92a0fb4edd70c8014edeaa4e8521fe',
			],
		},
		Quarter: {
			discountProductRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			effectiveStartDate: '2023-10-26',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: [
				'2c92a0fb4edd70c8014edeaa4eae220a',
				'2c92a0fb4edd70c8014edeaa4e8521fe',
			],
		},
		Annual: {
			discountProductRatePlanId: '2c92a0ff64176cd40164232c8ec97661',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			effectiveStartDate: '2018-06-22',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: ['2c92a0fb4edd70c8014edeaa4e972204'],
		},
	},
};
