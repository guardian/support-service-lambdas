import type { BillingPeriod } from '@modules/billingPeriod';
import { ValidationError } from '@modules/errors';
import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type {
	ProductCatalog,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';
import { isValidProductCurrency } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	RatePlan,
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CatalogInformation } from './catalogInformation';
import { getCatalogInformation } from './catalogInformation';
import type { ProductSwitchRequestBody } from './schemas';

export type AccountInformation = {
	id: string;
	identityId: string;
	emailAddress: string;
	firstName: string;
	lastName: string;
	defaultPaymentMethodId: string;
};

export type SubscriptionInformation = {
	accountNumber: string;
	subscriptionNumber: string;
	previousProductName: string;
	previousRatePlanName: string;
	previousAmount: number;
	currency: ProductCurrency<'SupporterPlus'>;
	billingPeriod: BillingPeriod;
};

export type SwitchInformation = {
	stage: Stage;
	input: ProductSwitchRequestBody;
	startNewTerm: boolean;
	contributionAmount: number;
	account: AccountInformation;
	subscription: SubscriptionInformation;
	catalog: CatalogInformation;
};

const getAccountInformation = (account: ZuoraAccount): AccountInformation => {
	return {
		id: account.basicInfo.id,
		identityId: account.basicInfo.identityId,
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
		defaultPaymentMethodId: account.billingAndPayment.defaultPaymentMethodId,
	};
};

export const getFirstContributionRatePlan = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
) => {
	const contributionProductRatePlanIds = [
		productCatalog.Contribution.ratePlans.Annual.id,
		productCatalog.Contribution.ratePlans.Monthly.id,
	];
	const contributionRatePlan = subscription.ratePlans.find(
		(ratePlan) =>
			ratePlan.lastChangeType !== 'Remove' &&
			contributionProductRatePlanIds.includes(ratePlan.productRatePlanId),
	);
	if (contributionRatePlan !== undefined) {
		return contributionRatePlan;
	}
	if (
		subscriptionHasAlreadySwitchedToSupporterPlus(productCatalog, subscription)
	) {
		throw new ValidationError(
			`The subscription ${subscription.subscriptionNumber} has already been switched to supporter plus: ${prettyPrint(subscription)}`,
		);
	}
	throw new ReferenceError(
		`Subscription ${subscription.subscriptionNumber} does not contain an active contribution rate plan: ${prettyPrint(subscription)}`,
	);
};

export const subscriptionHasAlreadySwitchedToSupporterPlus = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
) => {
	const contributionProductRatePlanIds = [
		productCatalog.Contribution.ratePlans.Annual.id,
		productCatalog.Contribution.ratePlans.Monthly.id,
	];
	const supporterPlusProductRatePlanIds = [
		productCatalog.SupporterPlus.ratePlans.Monthly.id,
		productCatalog.SupporterPlus.ratePlans.Annual.id,
	];
	return (
		subscription.ratePlans.find(
			(ratePlan) =>
				ratePlan.lastChangeType === 'Remove' &&
				contributionProductRatePlanIds.includes(ratePlan.productRatePlanId),
		) !== undefined &&
		subscription.ratePlans.find(
			(ratePlan) =>
				ratePlan.lastChangeType !== 'Remove' &&
				supporterPlusProductRatePlanIds.includes(ratePlan.productRatePlanId),
		) !== undefined
	);
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

// Gets a subscription from Zuora and checks that it is owned by currently logged-in user
export const getSwitchInformationWithOwnerCheck = (
	stage: Stage,
	input: ProductSwitchRequestBody,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	identityIdFromRequest: string,
	today: Dayjs = dayjs(),
): SwitchInformation => {
	console.log(
		`Checking subscription ${subscription.subscriptionNumber} is owned by the currently logged in user`,
	);
	const userInformation = getAccountInformation(account);
	if (userInformation.identityId !== identityIdFromRequest) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityIdFromRequest}`,
		);
	}
	console.log(
		`Subscription ${subscription.subscriptionNumber} is owned by identity user ${identityIdFromRequest}`,
	);

	const contributionRatePlan = getFirstContributionRatePlan(
		productCatalog,
		subscription,
	);
	const previousAmount = checkDefined(
		contributionRatePlan.ratePlanCharges[0]?.price,
		'No price found on the contribution rate plan charge',
	);
	const billingPeriod = checkDefined(
		contributionRatePlan.ratePlanCharges[0]?.billingPeriod,
		`No rate plan charge found on the rate plan ${prettyPrint(
			contributionRatePlan,
		)}`,
	);
	const currency = getCurrency(contributionRatePlan);

	const catalogInformation = getCatalogInformation(
		productCatalog,
		billingPeriod,
		currency,
	);

	const contributionAmount =
		input.price - catalogInformation.supporterPlus.price;

	const subscriptionInformation = {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: contributionRatePlan.productName,
		previousRatePlanName: contributionRatePlan.ratePlanName,
		previousAmount,
		currency,
		billingPeriod,
	};

	const termStartDate = dayjs(subscription.termStartDate).startOf('day');
	const startOfToday = today.startOf('day');
	const startNewTerm = termStartDate.isBefore(startOfToday);

	return {
		stage,
		input,
		startNewTerm,
		contributionAmount,
		account: userInformation,
		subscription: subscriptionInformation,
		catalog: catalogInformation,
	};
};
