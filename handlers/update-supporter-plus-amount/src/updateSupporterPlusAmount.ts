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

	const productRatePlans = ratePlans
		.filter((ratePlan) => ratePlan.lastChangeType !== 'Remove')
		.reduce((acc: SupporterPlusPlans[], ratePlan: RatePlan) => {
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
		}, []);

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
		supporterPlusPlans.contributionCharge.chargedThroughDate ?? // If the currently active charge is the one that was invoiced last
			supporterPlusPlans.contributionCharge.effectiveStartDate, // If there is a pending amendment
	);

	const newTermStartDate = getNewTermStartDate(
		subscription,
		supporterPlusPlans.contributionCharge,
		applyFromDate,
	);

	await doUpdate({
		zuoraClient,
		applyFromDate,
		newTermStartDate,
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
		newAmount: newPaymentAmount,
		billingPeriod: billingPeriod,
		identityId: account.basicInfo.identityId,
	};
};
