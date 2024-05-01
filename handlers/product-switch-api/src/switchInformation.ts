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
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RatePlan, ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
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

const getAccountInformation = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<AccountInformation> => {
	const account = await getAccount(zuoraClient, accountNumber);
	return {
		id: account.basicInfo.id,
		identityId: account.basicInfo.identityId,
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
		defaultPaymentMethodId: account.billingAndPayment.defaultPaymentMethodId,
	};
};

const getFirstContributionRatePlan = (
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
export const getSwitchInformationWithOwnerCheck = async (
	stage: Stage,
	input: ProductSwitchRequestBody,
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	identityId: string,
	subscriptionNumber: string,
): Promise<SwitchInformation> => {
	console.log(
		`Checking subscription ${subscriptionNumber} is owned by the currently logged in user`,
	);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const userInformation = await getAccountInformation(
		zuoraClient,
		subscription.accountNumber,
	);
	if (userInformation.identityId !== identityId) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityId}`,
		);
	}
	console.log(
		`Subscription ${subscriptionNumber} is owned by identity user ${identityId}`,
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

	const startNewTerm = !dayjs(subscription.termStartDate).isSame(dayjs());

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
