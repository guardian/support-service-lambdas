import type { Stage } from '@modules/stage';

export type Discount = {
	// Zuora discount API reference:
	// https://developer.zuora.com/v1-api-reference/api/operation/GET_ProductRatePlans/
	productRatePlanId: Record<Stage, string>;
	productRatePlanChargeId: Record<Stage, string>;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage?: number;
};

export const annualContribHalfPriceSupporterPlusForOneYear = {
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
} satisfies Discount;

export const monthlyDigiPlus: Discount = {
	productRatePlanId: {
		PROD: '8a1296cc9ef2fa7a019ef3bee7570e20',
		CODE: '6257d4fb107e4b438a6ede085f86d628',
	},
	productRatePlanChargeId: {
		PROD: '8a1281679ef2e320019ef3c14e6a71a2',
		CODE: '4a02ba3ebdcb4a469c402e09895cc716',
	},
	name: 'Upsell - Supporter Plus to Digital Plus Switch - Price Match',
	upToPeriods: 6,
	upToPeriodsType: 'Months',
};

export const annualDigiPlus: Discount = {
	productRatePlanId: {
		PROD: '8a1296cc9f1ba695019f21feb57a4350',
		CODE: '71a1b1d5a1f9f1dbccff21fbf2d4001f',
	},
	productRatePlanChargeId: {
		PROD: '8a1296cc9f1ba695019f21feb5cc4352',
		CODE: '71a1b1d5a1f9f1dbccff21fbf3610020',
	},
	name: 'Upsell - Supporter Plus to Digital Plus Switch - Annual Price Match',
	upToPeriods: 12,
	upToPeriodsType: 'Months',
};
