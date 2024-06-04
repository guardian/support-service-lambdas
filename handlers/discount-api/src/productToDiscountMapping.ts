import { getSingleOrThrow } from '@modules/arrayFunctions';
import type { BillingPeriod } from '@modules/billingPeriod';
import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import { isNotRemovedOrDiscount } from '@modules/zuora/rateplan';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

export function getDiscountableRatePlan(subscription: ZuoraSubscription) {
	return getSingleOrThrow(
		subscription.ratePlans,
		(msg) =>
			new Error(
				`Subscription ${subscription.subscriptionNumber} has multiple discountable rateplans ${msg}`,
			),
		isNotRemovedOrDiscount,
	);
}

export const getDiscountFromSubscription = (
	stage: Stage,
	subscription: ZuoraSubscription,
) => {
	const nonDiscountRatePlan = getDiscountableRatePlan(subscription);
	const discount =
		ProductToDiscountMapping[stage][nonDiscountRatePlan.productRatePlanId];

	if (discount == undefined) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} is not eligible for any discount`,
		);
	}

	return { discount, nonDiscountRatePlan };
};

export type Discount = {
	productRatePlanId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: string;
};

type Product = 'digiSub';

const catalog: {
	[K in 'CODE' | 'PROD']: {
		[K in Product]: { [K in BillingPeriod]: string };
	};
} = {
	CODE: {
		digiSub: {
			Month: '2c92c0f84bbfec8b014bc655f4852d9d',
			Quarter: '2c92c0f84bbfec58014bc6a2d43a1f5b',
			Annual: '2c92c0f94bbffaaa014bc6a4212e205b',
		},
	},
	PROD: {
		digiSub: {
			Month: '2c92a0fb4edd70c8014edeaa4eae220a',
			Quarter: '2c92a0fb4edd70c8014edeaa4e8521fe',
			Annual: '2c92a0fb4edd70c8014edeaa4e972204',
		},
	},
};

const Discounts: {
	[K in 'CODE' | 'PROD']: { [K in string]: Discount };
} = {
	CODE: {
		cancellation25pc3mo: {
			productRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			upToPeriods: 3,
			upToPeriodsType: 'Months',
		},
		cancellation25pc12mo: {
			productRatePlanId: '8ad08f068b5b9ca2018b5cadf0897ed3',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			upToPeriods: 12,
			upToPeriodsType: 'Months',
		},
	},
	PROD: {
		cancellation25pc3mo: {
			productRatePlanId: '2c92a0ff64176cd40164232c8ec97661',
			name: 'Cancellation Save Discount - 25% off for 3 months',
			upToPeriods: 3,
			upToPeriodsType: 'Months',
		},
		cancellation25pc12mo: {
			productRatePlanId: '8a128adf8b64bcfd018b6b6fdc7674f5',
			name: 'Cancellation Save Discount - 25% off for 12 months',
			upToPeriods: 12,
			upToPeriodsType: 'Months',
		},
	},
};

const ProductToDiscountMapping = {
	CODE: {
		[catalog.CODE.digiSub.Month]: Discounts.CODE.cancellation25pc3mo,
		[catalog.CODE.digiSub.Quarter]: Discounts.CODE.cancellation25pc3mo,
		[catalog.CODE.digiSub.Annual]: Discounts.CODE.cancellation25pc12mo,
	},
	CSBX: {
		[catalog.PROD.digiSub.Month]: Discounts.PROD.cancellation25pc3mo,
		[catalog.PROD.digiSub.Quarter]: Discounts.PROD.cancellation25pc3mo,
		[catalog.PROD.digiSub.Annual]: Discounts.PROD.cancellation25pc12mo,
	},
	PROD: {
		[catalog.PROD.digiSub.Month]: Discounts.PROD.cancellation25pc3mo,
		[catalog.PROD.digiSub.Quarter]: Discounts.PROD.cancellation25pc3mo,
		[catalog.PROD.digiSub.Annual]: Discounts.PROD.cancellation25pc12mo,
	},
};
