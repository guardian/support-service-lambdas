import { getSingleOrThrow } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { isSupportedCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type { ProductBillingPeriod } from '@modules/product-catalog/productBillingPeriods';
import type {
	ProductCatalog,
	ProductRatePlan,
} from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { RatePlan, RatePlanCharge } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { EmailFields } from './sendEmail';
import { supporterPlusAmountBands } from './supporterPlusAmountBands';
import { doUpdate } from './zuoraApi';

type UpdatablePlans =
	| 'Annual'
	| 'Monthly'
	| 'V1DeprecatedAnnual'
	| 'V1DeprecatedMonthly';

export type SupporterPlusData = {
	ratePlan: RatePlan;
	productRatePlan: ProductRatePlan<'SupporterPlus', UpdatablePlans>;
	chargeToUpdate: RatePlanCharge;
	basePriceMinorUnits: number;
};

type ProductData = {
	productRatePlan: ProductRatePlan<'SupporterPlus', UpdatablePlans>;
	chargeToUpdateId: string;
	baseChargeId?: string;
};

export const getSupporterPlusData = (
	productCatalog: ProductCatalog,
	ratePlans: RatePlan[],
): SupporterPlusData => {
	const supporterPlus = productCatalog.SupporterPlus.ratePlans;
	const supporterPlusProductData: Record<string, ProductData> = {
		[supporterPlus.Monthly.id]: {
			productRatePlan: supporterPlus.Monthly,
			chargeToUpdateId: supporterPlus.Monthly.charges.Contribution.id,
			baseChargeId: supporterPlus.Monthly.charges.Subscription.id,
		},
		[supporterPlus.Annual.id]: {
			productRatePlan: supporterPlus.Annual,
			chargeToUpdateId: supporterPlus.Annual.charges.Contribution.id,
			baseChargeId: supporterPlus.Annual.charges.Subscription.id,
		},
		[supporterPlus.V1DeprecatedMonthly.id]: {
			productRatePlan: supporterPlus.V1DeprecatedMonthly,
			chargeToUpdateId:
				supporterPlus.V1DeprecatedMonthly.charges.Subscription.id,
		},
		[supporterPlus.V1DeprecatedAnnual.id]: {
			productRatePlan: supporterPlus.V1DeprecatedAnnual,
			chargeToUpdateId:
				supporterPlus.V1DeprecatedAnnual.charges.Subscription.id,
		},
	};

	const activeRatePlans = ratePlans.filter(
		(ratePlan) => ratePlan.lastChangeType !== 'Remove',
	);
	logger.log(
		'active rate plans',
		activeRatePlans.map((rp) => rp.id),
	);
	const relevantRatePlans = activeRatePlans.flatMap((ratePlan) => {
		const productData = supporterPlusProductData[ratePlan.productRatePlanId];
		if (productData !== undefined) {
			return [{ ratePlan, productData }];
		} else {
			return [];
		}
	});
	logger.log(
		'relevant rate plans',
		relevantRatePlans.map((rp) => rp.ratePlan.id),
	);

	const relevantRatePlan = getSingleOrThrow(
		relevantRatePlans,
		(msg) => new Error(`wrong number of supporter plus rate plans: ${msg}`),
	);

	const { ratePlan, productData } = relevantRatePlan;

	const chargeToUpdate = getIfDefined(
		ratePlan.ratePlanCharges.find(
			(charge) =>
				charge.productRatePlanChargeId === productData.chargeToUpdateId,
		),
		`Could not find the contribution charge (with the id ${productData.chargeToUpdateId}) in this rate plan`,
	);

	logger.log('updatable charge', chargeToUpdate.id);

	const basePriceMinorUnits = productData.baseChargeId
		? getIfDefined(
				ratePlan.ratePlanCharges.find(
					(charge) =>
						charge.productRatePlanChargeId === productData.baseChargeId,
				)?.price,
				`Could not find the base charge with price property (with the id ${productData.baseChargeId}) in this rate plan`,
			) * 100
		: 0;

	logger.log('basePriceMinorUnits', basePriceMinorUnits);

	return {
		ratePlan,
		productRatePlan: productData.productRatePlan,
		chargeToUpdate,
		basePriceMinorUnits,
	};
};

const validateNewAmount = (
	newAmount: number,
	currency: IsoCurrency,
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
	if (!isSupportedCurrency(currency)) {
		throw new Error(`Unsupported currency ${currency}`);
	}

	const supporterPlusData = getSupporterPlusData(
		productCatalog,
		subscription.ratePlans,
	);

	const billingPeriod = getIfDefined(
		supporterPlusData.productRatePlan.billingPeriod,
		`Billing period was undefined in product rate plan ${prettyPrint(supporterPlusData.productRatePlan)}`,
	);

	validateNewAmount(newPaymentAmount, currency, billingPeriod);

	const newContributionAmount =
		(newPaymentAmount * 100 - supporterPlusData.basePriceMinorUnits) / 100;

	const { chargeToUpdate } = supporterPlusData;

	const applyFromDate = dayjs(
		chargeToUpdate.chargedThroughDate ?? // If the currently active charge is the one that was invoiced last
			chargeToUpdate.effectiveStartDate, // If there is a pending amendment
	);

	const shouldExtendTerm = applyFromDate.isAfter(
		dayjs(subscription.termEndDate),
	);

	logger.log(
		`apply change from: ${zuoraDateFormat(applyFromDate)}` +
			(shouldExtendTerm ? ' (term extension needed)' : ''),
	);

	await doUpdate({
		zuoraClient,
		applyFromDate,
		shouldExtendTerm,
		subscriptionNumber,
		accountNumber: subscription.accountNumber,
		ratePlanId: supporterPlusData.ratePlan.id,
		chargeNumber: chargeToUpdate.number,
		contributionAmount: newContributionAmount,
	});

	return {
		nextPaymentDate: dayjs(applyFromDate),
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
		currency: currency,
		newAmount: newPaymentAmount,
		billingPeriod: billingPeriod,
		identityId: account.basicInfo.identityId,
	};
};
