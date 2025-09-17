import type { BillingPeriod } from '@modules/billingPeriod';
import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { isSupportedCurrency } from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import type {
	RatePlan,
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CatalogInformation } from './catalogInformation';
import { getCatalogInformation } from './catalogInformation';
import type { Discount } from './discounts';
import { getDiscount } from './discounts';
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
	currency: IsoCurrency;
	billingPeriod: BillingPeriod;
};

export type SwitchInformation = {
	stage: Stage;
	input: ProductSwitchRequestBody;
	startNewTerm: boolean;
	contributionAmount: number;
	actualTotalPrice: number;
	account: AccountInformation;
	subscription: SubscriptionInformation;
	catalog: CatalogInformation;
	discount?: Discount;
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

const getCurrency = (contributionRatePlan: RatePlan): IsoCurrency => {
	const currency = getIfDefined(
		contributionRatePlan.ratePlanCharges[0]?.currency,
		'No currency found on the rate plan charge',
	);

	if (isSupportedCurrency(currency)) {
		return currency;
	}
	throw new Error(`Unsupported currency ${currency}`);
};

// Gets a subscription from Zuora and checks that it is owned by currently logged-in user
export const getSwitchInformationWithOwnerCheck = async (
	stage: Stage,
	input: ProductSwitchRequestBody,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	identityIdFromRequest: string | undefined,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	logger.log(
		`Checking subscription ${subscription.subscriptionNumber} is owned by the currently logged in user`,
	);
	const userInformation = getAccountInformation(account);
	if (
		identityIdFromRequest &&
		userInformation.identityId !== identityIdFromRequest
	) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityIdFromRequest}`,
		);
	}
	logger.log(
		`Subscription ${subscription.subscriptionNumber} is owned by identity user ${identityIdFromRequest}`,
	);

	const contributionRatePlan = getFirstContributionRatePlan(
		productCatalog,
		subscription,
	);
	const previousAmount = getIfDefined(
		contributionRatePlan.ratePlanCharges[0]?.price,
		'No price found on the contribution rate plan charge',
	);
	const billingPeriod = getIfDefined(
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

	const maybeDiscount = await getDiscount(
		!!input.applyDiscountIfAvailable,
		previousAmount,
		catalogInformation.supporterPlus.price,
		billingPeriod,
		subscription.status,
		account.metrics.totalInvoiceBalance,
		stage,
		lazyBillingPreview,
	);

	const actualBasePrice =
		maybeDiscount?.discountedPrice ?? catalogInformation.supporterPlus.price;

	// newAmount is only passed in where the user is in the switch journey - for cancellation saves the new amount is discounted for the first year - they always get the base price (with discount)
	const userDesiredAmount = input.newAmount ?? previousAmount;

	// Validate that the user's desired amount is at least the base Supporter Plus price
	// Only validate when newAmount is explicitly provided by the frontend
	if (input.newAmount && userDesiredAmount < actualBasePrice) {
		throw new ValidationError(
			`Cannot switch to Supporter Plus: desired amount (${userDesiredAmount}) is less than the minimum Supporter Plus price (${actualBasePrice}). Use the members-data-api to modify contribution amounts instead.`,
		);
	}

	const contributionAmount = Math.max(0, userDesiredAmount - actualBasePrice);

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
		actualTotalPrice: contributionAmount + actualBasePrice,
		account: userInformation,
		subscription: subscriptionInformation,
		catalog: catalogInformation,
		discount: maybeDiscount,
	};
};
