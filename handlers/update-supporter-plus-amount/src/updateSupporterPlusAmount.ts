import { ValidationError } from '@modules/errors';
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
import dayjs from 'dayjs';
import type { EmailFields } from './sendEmail';
import { supporterPlusAmountBands } from './supporterPlusAmountBands';
import { doUpdate } from './zuoraApi';

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
		throw new ValidationError(
			`Amount ${newAmount} is below the minimum of ${amountBand.min}`,
		);
	}
	if (newAmount > amountBand.max) {
		throw new ValidationError(
			`Amount ${newAmount} is above the maximum of ${amountBand.max}`,
		);
	}
};

export const updateSupporterPlusAmount = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	identityIdFromRequest: string,
	subscriptionNumber: string,
	newPaymentAmount: number,
): Promise<EmailFields> => {
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	if (account.basicInfo.identityId !== identityIdFromRequest) {
		throw new ValidationError(
			`Subscription ${subscriptionNumber} does not belong to identity ID ${identityIdFromRequest}`,
		);
	}
	const currency = account.billingAndPayment.currency;
	if (!isProductCurrency('SupporterPlus', currency)) {
		throw new Error(`Unsupported currency ${currency}`);
	}

	const supporterPlusPlans = getSupporterPlusPlans(
		productCatalog,
		subscription.ratePlans,
	);

	const billingPeriod = checkDefined(
		supporterPlusPlans.productRatePlan.billingPeriod,
		`Billing period was undefined in product rate plan ${prettyPrint(supporterPlusPlans.productRatePlan)}`,
	);

	validateNewAmount(newPaymentAmount, currency, billingPeriod);
	const newContributionAmount =
		newPaymentAmount - supporterPlusPlans.productRatePlan.pricing[currency];

	const applyFromDate = dayjs(
		supporterPlusPlans.contributionCharge.chargedThroughDate ??
			supporterPlusPlans.contributionCharge.effectiveStartDate,
	);

	const startNewTerm = dayjs(subscription.termEndDate).isBefore(applyFromDate);

	await doUpdate({
		zuoraClient,
		applyFromDate,
		startNewTerm,
		subscriptionNumber,
		accountNumber: subscription.accountNumber,
		ratePlanId: supporterPlusPlans.ratePlan.id,
		chargeNumber: supporterPlusPlans.contributionCharge.number,
		contributionAmount: newContributionAmount,
	});

	return {
		nextPaymentDate: dayjs(applyFromDate),
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
		currency: currency,
		newAmount: newContributionAmount,
		billingPeriod: billingPeriod,
		identityId: account.basicInfo.identityId,
	};
};
