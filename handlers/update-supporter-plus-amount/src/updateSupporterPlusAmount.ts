import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type {
	ProductBillingPeriod,
	ProductCatalog,
	ProductCurrency,
	ProductRatePlan,
} from '@modules/product-catalog/productCatalog';
import { isProductCurrency } from '@modules/product-catalog/productCatalog';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RatePlan, RatePlanCharge } from '@modules/zuora/zuoraSchemas';
import { supporterPlusAmountBands } from './supporterPlusAmountBands';

export type SupporterPlusPlans = {
	ratePlan: RatePlan;
	productRatePlan: ProductRatePlan<'SupporterPlus', 'Annual' | 'Monthly'>;
	contributionCharge: RatePlanCharge;
};

export const getSupporterPlusPlans = (
	productCatalog: ProductCatalog,
	ratePlans: RatePlan[],
): SupporterPlusPlans => {
	const supporterPlusProductRatePlans = {
		[productCatalog.SupporterPlus.ratePlans.Monthly.id]:
			productCatalog.SupporterPlus.ratePlans.Monthly,
		[productCatalog.SupporterPlus.ratePlans.Annual.id]:
			productCatalog.SupporterPlus.ratePlans.Annual,
	};

	const productRatePlans = ratePlans.reduce(
		(acc: SupporterPlusPlans[], ratePlan: RatePlan) => {
			const productRatePlan =
				supporterPlusProductRatePlans[ratePlan.productRatePlanId];

			if (productRatePlan !== undefined) {
				const contributionCharge = checkDefined(
					ratePlan.ratePlanCharges.find(
						(ratePlan) =>
							ratePlan.productRatePlanChargeId ===
							productRatePlan.charges.Contribution.id,
					),
					'Contribution charge not found in rate plan',
				);
				acc.push({ ratePlan, productRatePlan, contributionCharge });
			}
			return acc;
		},
		[],
	);

	if (productRatePlans.length !== 1 || productRatePlans[0] === undefined) {
		throw new Error(
			`Expected 1 rate plan for Supporter Plus, got ${ratePlans.length}`,
		);
	}
	return productRatePlans[0];
};

const validateNewAmount = (
	newAmount: number,
	currency: ProductCurrency<'SupporterPlus'>,
	billingPeriod: ProductBillingPeriod<'SupporterPlus'>,
): void => {
	const amountBand = supporterPlusAmountBands[currency][billingPeriod];
	if (newAmount < amountBand.min) {
		throw new Error(
			`Amount ${newAmount} is below the minimum of ${amountBand.min}`,
		);
	}
	if (newAmount > amountBand.max) {
		throw new Error(
			`Amount ${newAmount} is above the maximum of ${amountBand.max}`,
		);
	}
};

const doUpdate = (
	newContributionAmount: number,
	applyFromDate: Date,
	supporterPlusPlans: SupporterPlusPlans,
	zuoraClient: ZuoraClient,
) => {};
export const updateSupporterPlusAmount = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	subscriptionNumber: string,
	newPaymentAmount: number,
): Promise<void> => {
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	const currency = account.billingAndPayment.currency;
	if (!isProductCurrency('SupporterPlus', currency)) {
		throw new Error(`Unsupported currency ${currency}`);
	}

	const supporterPlusPlans = getSupporterPlusPlans(
		productCatalog,
		subscription.ratePlans,
	);

	validateNewAmount(
		newPaymentAmount,
		currency,
		checkDefined(
			supporterPlusPlans.productRatePlan.billingPeriod,
			`Billing period was undefined in product rate plan ${prettyPrint(supporterPlusPlans.productRatePlan)}`,
		),
	);
	const newContributionAmount =
		newPaymentAmount - supporterPlusPlans.productRatePlan.pricing[currency];

	const applyFromDate =
		supporterPlusPlans.contributionCharge.chargedThroughDate ??
		supporterPlusPlans.contributionCharge.effectiveStartDate;

	if (subscription.termEndDate < applyFromDate) {
		// We need to extend the term
	}

	doUpdate(
		newContributionAmount,
		applyFromDate,
		supporterPlusPlans,
		zuoraClient,
	);
	console.log(`${supporterPlusPlans.ratePlan.id} ${currency}`);
};
