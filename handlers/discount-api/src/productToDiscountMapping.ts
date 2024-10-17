import { getSingleOrThrow } from '@modules/arrayFunctions';
import type { DataExtensionName } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import { isNotRemovedOrDiscount } from '@modules/zuora/rateplan';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

function getDiscountableRatePlan(subscription: ZuoraSubscription) {
	return getSingleOrThrow(
		subscription.ratePlans.filter(isNotRemovedOrDiscount),
		(msg) =>
			new Error(
				`Subscription ${subscription.subscriptionNumber} has multiple discountable rateplans ${msg}`,
			),
	);
}

export const getDiscountFromSubscription = (
	stage: Stage,
	subscription: ZuoraSubscription,
) => {
	const discountableProductRatePlanId =
		getDiscountableRatePlan(subscription).productRatePlanId;
	const discount =
		ProductToDiscountMapping(stage)[discountableProductRatePlanId];

	if (discount === undefined) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} is not eligible for any discount`,
		);
	}

	return { discount, discountableProductRatePlanId };
};

export type EligibilityCheck =
	| 'EligibleForFreePeriod'
	| 'AtCatalogPrice'
	| 'NoRepeats'
	| 'NoCheck';

export type Discount = {
	productRatePlanId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: string;
	emailIdentifier: DataExtensionName;
	eligibilityCheckForRatePlan?: EligibilityCheck;
};

export const catalog = {
	CODE: {
		digiSub: {
			Month: '2c92c0f84bbfec8b014bc655f4852d9d',
			Quarter: '2c92c0f84bbfec58014bc6a2d43a1f5b',
			Annual: '2c92c0f94bbffaaa014bc6a4212e205b',
		},
		supporterPlus: {
			Month: '8ad08cbd8586721c01858804e3275376',
			Annual: '8ad08e1a8586721801858805663f6fab',
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
			Annual: '8a128ed885fc6ded01860228f77e3d5a',
		},
		recurringContribution: {
			Month: '2c92a0fc5aacfadd015ad24db4ff5e97',
		},
	},
};

const Discounts = (stage: Stage) => {
	const getCancellationFree2Mo = (
		eligibilityCheckForRatePlan: EligibilityCheck,
		dataExtensionName: DataExtensionName,
	): Discount => ({
		productRatePlanId: {
			CODE: '8ad081dd8fd3d9df018fe2b6a7bc379d',
			PROD: '8a1299c28fb956e8018fe2c0e12c3ae4',
		}[stage],
		name: 'Cancellation Save Discount - Free for 2 months',
		upToPeriods: 2,
		upToPeriodsType: 'Months',
		emailIdentifier: dataExtensionName,
		eligibilityCheckForRatePlan: eligibilityCheckForRatePlan,
	});

	const getCancellation25pc12mo = (
		eligibilityCheckForRatePlan: EligibilityCheck,
		dataExtensionName: DataExtensionName,
	): Discount => ({
		productRatePlanId: {
			CODE: '8ad08f068b5b9ca2018b5cadf0897ed3',
			PROD: '8a128adf8b64bcfd018b6b6fdc7674f5',
		}[stage],
		name: 'Cancellation Save Discount - 25% off for 12 months',
		upToPeriods: 12,
		upToPeriodsType: 'Months',
		emailIdentifier: dataExtensionName,
		eligibilityCheckForRatePlan: eligibilityCheckForRatePlan,
	});

	return {
		cancellation25pc3mo: {
			productRatePlanId: {
				CODE: '2c92c0f962cec7990162d3882afc52dd',
				PROD: '2c92a0ff64176cd40164232c8ec97661',
			}[stage],
			name: 'Cancellation Save Discount - 25% off for 3 months',
			upToPeriods: 3,
			upToPeriodsType: 'Months',
			emailIdentifier:
				DataExtensionNames.digipackMonthlyDiscountConfirmationEmail,
			eligibilityCheckForRatePlan: 'AtCatalogPrice',
		},
		cancellation25pc12mo: getCancellation25pc12mo(
			'AtCatalogPrice',
			DataExtensionNames.digipackAnnualDiscountConfirmationEmail,
		),
		cancellationFree2MoSP: getCancellationFree2Mo(
			'EligibleForFreePeriod',
			DataExtensionNames.cancellationDiscountConfirmation,
		),
		cancellationFree2MoRC: getCancellationFree2Mo(
			'NoCheck',
			DataExtensionNames.contributionPauseConfirmationEmail,
		),
		cancellation25pc12moSP: getCancellation25pc12mo(
			'NoRepeats',
			DataExtensionNames.supporterPlusAnnualDiscountConfirmationEmail,
		),
	} as const satisfies { [K in string]: Discount };
};

function ProductToDiscountMapping(stage: Stage) {
	const catalogForStage = catalog[stage];
	const DiscountsForStage = Discounts(stage);

	return {
		[catalogForStage.digiSub.Month]: DiscountsForStage.cancellation25pc3mo,
		[catalogForStage.digiSub.Quarter]: DiscountsForStage.cancellation25pc3mo,
		[catalogForStage.digiSub.Annual]: DiscountsForStage.cancellation25pc12mo,
		[catalogForStage.supporterPlus.Month]:
			DiscountsForStage.cancellationFree2MoSP,
		[catalogForStage.recurringContribution.Month]:
			DiscountsForStage.cancellationFree2MoRC,
		[catalogForStage.supporterPlus.Annual]:
			DiscountsForStage.cancellation25pc12moSP,
	};
}
