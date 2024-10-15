import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
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

	const updatableChargeData = ratePlans
		.map((ratePlan) => ({
			ratePlan,
			productData: supporterPlusProductData[ratePlan.productRatePlanId],
		}))
		.filter(
			(item): item is { ratePlan: RatePlan; productData: ProductData } =>
				item.ratePlan.lastChangeType !== 'Remove' &&
				item.productData !== undefined,
		)
		.map((item) => {
			const { ratePlan, productData } = item;
			const { productRatePlan, planHasSeparateContributionCharge } =
				productData;
			const chargeToUpdate = getIfDefined(
				ratePlan.ratePlanCharges.find(
					(charge) =>
						charge.productRatePlanChargeId === productData.chargeToUpdateId,
				),
				`Couldn\t find a charge with the id ${productData.chargeToUpdateId} in this rate plan`,
			);
			return {
				ratePlan,
				productRatePlan,
				chargeToUpdate,
				planHasSeparateContributionCharge,
			};
		});

	if (
		updatableChargeData.length !== 1 ||
		updatableChargeData[0] === undefined
	) {
		throw new Error(
			`Expected 1 rate plan for Supporter Plus, got ${ratePlans.length}`,
		);
	}
	return updatableChargeData[0];
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
		supporterPlusData.planHasSeparateContributionCharge
			? newPaymentAmount - supporterPlusData.productRatePlan.pricing[currency]
			: newPaymentAmount;

	const applyFromDate = dayjs(
		supporterPlusData.chargeToUpdate.chargedThroughDate ?? // If the currently active charge is the one that was invoiced last
			supporterPlusData.chargeToUpdate.effectiveStartDate, // If there is a pending amendment
	);

	const newTermStartDate = getNewTermStartDate(
		subscription,
		supporterPlusData.chargeToUpdate,
		applyFromDate,
	);

	await doUpdate({
		zuoraClient,
		applyFromDate,
		newTermStartDate,
		subscriptionNumber,
		accountNumber: subscription.accountNumber,
		ratePlanId: supporterPlusData.ratePlan.id,
		chargeNumber: supporterPlusData.chargeToUpdate.number,
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
