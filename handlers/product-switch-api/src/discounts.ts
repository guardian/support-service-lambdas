import type { Stage } from '@modules/stage';

export type Discount = {
	// Zuora discount API reference:
	// https://developer.zuora.com/v1-api-reference/api/operation/GET_ProductRatePlans/
	productRatePlanId: string;
	productRatePlanChargeId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage: number;
	discountedPrice: number;
};

type PartialDiscount = Omit<Discount, 'discountedPrice'>;

export const annualContribHalfPriceSupporterPlusForOneYear = (
	stage: Stage,
): PartialDiscount => ({
	productRatePlanId:
		stage === 'PROD'
			? '8a12994695aa4f680195ae2dc9d221d8'
			: '71a1383e2b395842e6f58a2754ad00c1',
	productRatePlanChargeId:
		stage === 'PROD'
			? '8a1280be95aa24270195ae3039934db7'
			: '71a116628da95844dde58a2a18ef0059',
	name: 'Cancellation Save - Annual Contribution to Supporter Plus Switch 50% off 1 year',
	upToPeriods: 1,
	upToPeriodsType: 'Years',
	discountPercentage: 50,
});
