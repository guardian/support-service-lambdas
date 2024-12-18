import { getSingleOrThrow } from '@modules/utils/arrayFunctions';
import { ValidationError } from '@modules/utils/errors';
import type { Currency } from '@modules/internationalisation/currency';
import { isSupportedCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/utils/nullAndUndefined';
import { prettyPrint } from '@modules/utils/prettyPrint';
import type {
	ProductBillingPeriod,
	ProductCatalog,
	ProductRatePlan,
} from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import type { Logger } from '@modules/zuora/logger';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
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
	planHasSeparateContributionCharge: boolean;
};

type ProductData = {
	productRatePlan: ProductRatePlan<'SupporterPlus', UpdatablePlans>;
	chargeToUpdateId: string;
	planHasSeparateContributionCharge: boolean;
};

export const getSupporterPlusData = (
	logger: Logger,
	productCatalog: ProductCatalog,
	ratePlans: RatePlan[],
): SupporterPlusData => {
	const supporterPlus = productCatalog.SupporterPlus.ratePlans;
	const supporterPlusProductData: Record<string, ProductData> = {
		[supporterPlus.Monthly.id]: {
			productRatePlan: supporterPlus.Monthly,
			chargeToUpdateId: supporterPlus.Monthly.charges.Contribution.id,
			planHasSeparateContributionCharge: true,
		},
		[supporterPlus.Annual.id]: {
			productRatePlan: supporterPlus.Annual,
			chargeToUpdateId: supporterPlus.Annual.charges.Contribution.id,
			planHasSeparateContributionCharge: true,
		},
		[supporterPlus.V1DeprecatedMonthly.id]: {
			productRatePlan: supporterPlus.V1DeprecatedMonthly,
			chargeToUpdateId:
				supporterPlus.V1DeprecatedMonthly.charges.Subscription.id,
			planHasSeparateContributionCharge: false,
		},
		[supporterPlus.V1DeprecatedAnnual.id]: {
			productRatePlan: supporterPlus.V1DeprecatedAnnual,
			chargeToUpdateId:
				supporterPlus.V1DeprecatedAnnual.charges.Subscription.id,
			planHasSeparateContributionCharge: false,
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
	const { productRatePlan, planHasSeparateContributionCharge } = productData;

	const chargeToUpdate = getIfDefined(
		ratePlan.ratePlanCharges.find(
			(charge) =>
				charge.productRatePlanChargeId === productData.chargeToUpdateId,
		),
		`Could not find a charge with the id ${productData.chargeToUpdateId} in this rate plan`,
	);

	logger.log('updatable charge', chargeToUpdate.id);

	return {
		ratePlan,
		productRatePlan,
		chargeToUpdate,
		planHasSeparateContributionCharge,
	};
};

const validateNewAmount = (
	newAmount: number,
	currency: Currency,
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

const getNewTermStartDate = (
	subscription: ZuoraSubscription,
	contributionCharge: RatePlanCharge,
	applyFromDate: Dayjs,
): Dayjs | undefined => {
	if (applyFromDate.isAfter(dayjs(subscription.termEndDate))) {
		// This will cause an error in Zuora "The Contract effective date should not be later than the term end date of the basic subscription."
		// because you can't add an update after the current term end date.
		// This has probably happened because the subscription was updated without a new term being started,
		// so the charge is no longer aligned with the term. To fix this we can start a new term from
		// the point at which the current term started.
		const potentialNewTermStartDate = dayjs(
			contributionCharge.effectiveStartDate,
		);
		const today = dayjs().startOf('day');
		if (potentialNewTermStartDate.isBefore(today)) {
			// Only start a new term if the charge we are dealing with started in the past, I'm not sure what
			// will happen otherwise! We can investigate when/if we get a "The Contract effective date..." error from a
			// subscription in that state
			return potentialNewTermStartDate;
		}
	}
	return undefined;
};

export const updateSupporterPlusAmount = async (
	logger: Logger,
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
		logger,
		productCatalog,
		subscription.ratePlans,
	);

	const billingPeriod = getIfDefined(
		supporterPlusData.productRatePlan.billingPeriod,
		`Billing period was undefined in product rate plan ${prettyPrint(supporterPlusData.productRatePlan)}`,
	);

	validateNewAmount(newPaymentAmount, currency, billingPeriod);

	const productPrice = getIfDefined(
		supporterPlusData.productRatePlan.pricing[currency],
		`SupporterPlus pricing was undefined for currency ${currency}`,
	);
	const newContributionAmount =
		supporterPlusData.planHasSeparateContributionCharge
			? newPaymentAmount - productPrice
			: newPaymentAmount;

	const { chargeToUpdate } = supporterPlusData;

	const applyFromDate = dayjs(
		chargeToUpdate.chargedThroughDate ?? // If the currently active charge is the one that was invoiced last
			chargeToUpdate.effectiveStartDate, // If there is a pending amendment
	);

	const newTermStartDate = getNewTermStartDate(
		subscription,
		chargeToUpdate,
		applyFromDate,
	);

	logger.log(
		`new term date: ${newTermStartDate ? zuoraDateFormat(newTermStartDate) : undefined} and apply from: ${zuoraDateFormat(applyFromDate)}`,
	);

	await doUpdate({
		zuoraClient,
		applyFromDate,
		newTermStartDate,
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
