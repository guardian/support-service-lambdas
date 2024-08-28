import { getSingleOrThrow } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import { isNotRemovedOrDiscount } from '@modules/zuora/rateplan';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

export type EligibilityCheck =
	| 'EligibleForFreePeriod'
	| 'AtCatalogPrice'
	| 'NoCheck';

export type Discount = {
	productRatePlanId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: string;
	sendEmail: boolean;
	eligibilityCheckForRatePlan?: EligibilityCheck;
};

export const productToDiscountMapping = (stage: Stage) => {
	const getDiscountFromSubscription = (subscription: ZuoraSubscription) => {
		const discountableRatePlan = getSingleOrThrow(
			subscription.ratePlans.filter(isNotRemovedOrDiscount),
			(msg) =>
				new Error(
					`Subscription ${subscription.subscriptionNumber} has multiple discountable rateplans ${msg}`,
				),
		);
		const discountableProductRatePlanId =
			discountableRatePlan.productRatePlanId;
		const discount = ProductToDiscountMapping[discountableProductRatePlanId];

		if (discount === undefined) {
			throw new ValidationError(
				`Subscription ${subscription.subscriptionNumber} is not eligible for any discount`,
			);
		}

		return { discount, discountableProductRatePlanId };
	};

	const catalog = {
		CODE: {
			digiSub: {
				Month: '2c92c0f84bbfec8b014bc655f4852d9d',
				Quarter: '2c92c0f84bbfec58014bc6a2d43a1f5b',
				Annual: '2c92c0f94bbffaaa014bc6a4212e205b',
			},
			supporterPlus: {
				Month: '8ad08cbd8586721c01858804e3275376',
			},
			recurringContribution: {
				Month: '2c92c0f85a6b134e015a7fcd9f0c7855',
			},
		},
		PROD: {
			digiSub: {
				Month: '2c92a0fb4edd70c8014edeaa4eae220a',
				Quarter: '2c92a0fb4edd70c8014edeaa4e8521fe',
				Annual: '2c92a0fb4edd70c8014edeaa4e972204',
			},
			supporterPlus: {
				Month: '8a128ed885fc6ded018602296ace3eb8',
			},
			recurringContribution: {
				Month: '2c92a0fc5aacfadd015ad24db4ff5e97',
			},
		},
	}[stage];

	const getCancellationFree2Mo = (
		eligibilityCheckForRatePlan: EligibilityCheck,
	): Discount => {
		return {
			productRatePlanId: {
				CODE: '8ad081dd8fd3d9df018fe2b6a7bc379d',
				PROD: '8a1299c28fb956e8018fe2c0e12c3ae4',
			}[stage],
			name: 'Cancellation Save Discount - Free for 2 months',
			upToPeriods: 2,
			upToPeriodsType: 'Months',
			sendEmail: true,
			eligibilityCheckForRatePlan: eligibilityCheckForRatePlan,
		};
	};

	const Discounts: { [K in string]: Discount } = {
		cancellation25pc3mo: {
			productRatePlanId: {
				CODE: '2c92c0f962cec7990162d3882afc52dd',
				PROD: '2c92a0ff64176cd40164232c8ec97661',
			}[stage],
			name: 'Cancellation Save Discount - 25% off for 3 months',
			upToPeriods: 3,
			upToPeriodsType: 'Months',
			sendEmail: false,
			eligibilityCheckForRatePlan: 'AtCatalogPrice',
		},
		cancellation25pc12mo: {
			productRatePlanId: {
				CODE: '8ad08f068b5b9ca2018b5cadf0897ed3',
				PROD: '8a128adf8b64bcfd018b6b6fdc7674f5',
			}[stage],
			name: 'Cancellation Save Discount - 25% off for 12 months',
			upToPeriods: 12,
			upToPeriodsType: 'Months',
			sendEmail: false,
			eligibilityCheckForRatePlan: 'AtCatalogPrice',
		},
		cancellationFree2MoSP: getCancellationFree2Mo('EligibleForFreePeriod'),
		cancellationFree2MoRC: getCancellationFree2Mo('NoCheck'),
	};

	const ProductToDiscountMapping = {
		[catalog.digiSub.Month]: Discounts.cancellation25pc3mo,
		[catalog.digiSub.Quarter]: Discounts.cancellation25pc3mo,
		[catalog.digiSub.Annual]: Discounts.cancellation25pc12mo,
		[catalog.supporterPlus.Month]: Discounts.cancellationFree2MoSP,
		[catalog.recurringContribution.Month]: Discounts.cancellationFree2MoRC,
	};

	return { getDiscountFromSubscription, catalog };
};
