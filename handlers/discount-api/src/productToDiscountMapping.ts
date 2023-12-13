import type { Stage } from '../../../modules/stage';

export const ProductToDiscountMapping: {
	[K in Stage]: Array<{
		discountProductRatePlanId: string;
		name: string;
		effectiveStartDate: string;
		effectiveEndDate: string;
		eligibleProductRatePlanIds: string[];
	}>;
} = {
	CODE: [
		{
			discountProductRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			effectiveStartDate: '2018-04-01',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: [
				'2c92c0f84bbfec8b014bc655f4852d9d',
				'2c92c0f84bbfec58014bc6a2d43a1f5b',
			],
		},
		{
			discountProductRatePlanId: '8ad08f068b5b9ca2018b5cadf0897ed3',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			effectiveStartDate: '2023-10-23',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: ['2c92c0f94bbffaaa014bc6a4212e205b'],
		},
	],
	PROD: [
		{
			discountProductRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			effectiveStartDate: '2023-10-26',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: [
				'2c92a0fb4edd70c8014edeaa4eae220a',
				'2c92a0fb4edd70c8014edeaa4e8521fe',
			],
		},
		{
			discountProductRatePlanId: '2c92a0ff64176cd40164232c8ec97661',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			effectiveStartDate: '2018-06-22',
			effectiveEndDate: '2099-03-08',
			eligibleProductRatePlanIds: ['2c92a0fb4edd70c8014edeaa4e972204'],
		},
	],
};
