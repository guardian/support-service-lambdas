import type { Stage } from '@modules/stage';

export type Discount = {
	// Zuora discount API reference:
	// https://developer.zuora.com/v1-api-reference/api/operation/GET_ProductRatePlans/
	productRatePlanId: Record<Stage, string>;
	productRatePlanChargeId: Record<Stage, string>;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage: number;
};

export const annualContribHalfPriceSupporterPlusForOneYear: Discount = {
	productRatePlanId: {
		PROD: '8a12994695aa4f680195ae2dc9d221d8',
		CODE: '71a1383e2b395842e6f58a2754ad00c1',
	},
	productRatePlanChargeId: {
		PROD: '8a1280be95aa24270195ae3039934db7',
		CODE: '71a116628da95844dde58a2a18ef0059',
	},
	name: 'Cancellation Save - Annual Contribution to Supporter Plus Switch 50% off 1 year',
	upToPeriods: 1,
	upToPeriodsType: 'Years',
	discountPercentage: 50,
};

export const monthlyDigiPlus: Discount = {
	productRatePlanId: {
		PROD: 'tbc',
		CODE: '6257d4fb107e4b438a6ede085f86d628',
	},
	productRatePlanChargeId: {
		PROD: 'tbc',
		CODE: '4a02ba3ebdcb4a469c402e09895cc716',
	},
	name: 'Upsell - Supporter Plus to Digital Plus Switch tbc off',
	upToPeriods: 1,
	upToPeriodsType: 'Months',
	discountPercentage: 25,
};
