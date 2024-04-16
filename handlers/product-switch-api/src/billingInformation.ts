import type { BillingPeriod } from '@modules/billingPeriod';
import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type {
	ProductCatalog,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';
import { isValidProductCurrency } from '@modules/product-catalog/productCatalog';
import type { RatePlan, ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';

export type BillingInformation = {
	billingAmount: number;
	billingPeriod: BillingPeriod;
	productPrice: number;
	contributionAmount: number;
	currency: ProductCurrency<'SupporterPlus'>;
	startNewTerm: boolean;
	supporterPlus: {
		productRatePlanId: string;
		subscriptionChargeId: string;
		contributionChargeId: string;
	};
	contribution: {
		productRatePlanId: string;
		chargeId: string;
	};
};

const getCurrency = (
	contributionRatePlan: RatePlan,
): ProductCurrency<'SupporterPlus'> => {
	const currency = checkDefined(
		contributionRatePlan.ratePlanCharges[0]?.currency,
		'No currency found on the rate plan charge',
	);

	if (isValidProductCurrency('SupporterPlus', currency)) {
		return currency;
	}
	throw new Error(`Unsupported currency ${currency}`);
};

export const getFirstContributionRatePlan = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
) => {
	const contributionProductRatePlanIds = [
		productCatalog.Contribution.ratePlans.Annual.id,
		productCatalog.Contribution.ratePlans.Monthly.id,
	];
	return checkDefined(
		subscription.ratePlans.find(
			(ratePlan) =>
				ratePlan.lastChangeType !== 'Remove' &&
				contributionProductRatePlanIds.includes(ratePlan.productRatePlanId),
		),
		`No contribution rate plan found in the subscription ${prettyPrint(
			subscription,
		)}`,
	);
};

export const getBillingInformation = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
	billingAmount: number,
) => {
	const contributionRatePlan = getFirstContributionRatePlan(
		productCatalog,
		subscription,
	);

	const billingPeriod = checkDefined(
		contributionRatePlan.ratePlanCharges[0]?.billingPeriod,
		`No rate plan charge found on the rate plan ${prettyPrint(
			contributionRatePlan,
		)}`,
	);
	const currency = getCurrency(contributionRatePlan);

	const startNewTerm = !dayjs(subscription.termStartDate).isSame(dayjs());

	return getBillingInformationForBillingPeriod(
		productCatalog,
		billingPeriod,
		currency,
		billingAmount,
		startNewTerm,
	);
};

const getBillingInformationForBillingPeriod = (
	productCatalog: ProductCatalog,
	billingPeriod: BillingPeriod,
	currency: ProductCurrency<'SupporterPlus'>,
	billingAmount: number,
	startNewTerm: boolean,
): BillingInformation => {
	if (billingPeriod == 'Annual') {
		const productPrice =
			productCatalog.SupporterPlus.ratePlans.Annual.pricing[currency];
		const contributionAmount = billingAmount - productPrice;
		return {
			billingAmount,
			billingPeriod,
			productPrice,
			contributionAmount,
			currency,
			startNewTerm,
			supporterPlus: {
				productRatePlanId: productCatalog.SupporterPlus.ratePlans.Annual.id,
				subscriptionChargeId:
					productCatalog.SupporterPlus.ratePlans.Annual.charges.Subscription.id,
				contributionChargeId:
					productCatalog.SupporterPlus.ratePlans.Annual.charges.Contribution.id,
			},
			contribution: {
				productRatePlanId: productCatalog.Contribution.ratePlans.Annual.id,
				chargeId:
					productCatalog.Contribution.ratePlans.Annual.charges.Contribution.id,
			},
		};
	} else if (billingPeriod == 'Month') {
		const productPrice =
			productCatalog.SupporterPlus.ratePlans.Monthly.pricing[currency];
		const contributionAmount = billingAmount - productPrice;
		return {
			billingAmount,
			billingPeriod,
			productPrice,
			contributionAmount,
			currency,
			startNewTerm,
			supporterPlus: {
				productRatePlanId: productCatalog.SupporterPlus.ratePlans.Monthly.id,
				subscriptionChargeId:
					productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription
						.id,
				contributionChargeId:
					productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution
						.id,
			},
			contribution: {
				productRatePlanId: productCatalog.Contribution.ratePlans.Monthly.id,
				chargeId:
					productCatalog.Contribution.ratePlans.Monthly.charges.Contribution.id,
			},
		};
	}

	throw new Error(`Unsupported billing period ${billingPeriod}`);
};
