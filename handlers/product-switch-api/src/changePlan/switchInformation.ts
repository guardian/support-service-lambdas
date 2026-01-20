import { ValidationError } from '@modules/errors';
import {
	type IsoCurrency,
	isSupportedCurrency,
} from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import {
	ProductCatalog,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import {
	RatePlanCharge,
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { CatalogInformation } from '../catalogInformation';
import type { Discount } from '../discounts';
import { getDiscount } from '../discounts';
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from '../schemas';
import { objectValues } from '@modules/objectFunctions';
import { getIfNonEmpty, isInList, sumNumbers } from '@modules/arrayFunctions';
import { ValidTargetZuoraBillingPeriod } from '../validSwitches';
import { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	GuardianRatePlan,
	GuardianSubscriptionParser,
} from './guardianSubscriptionParser';
import { SubscriptionFilter } from './subscriptionFilter';
import {
	AnyGuardianCatalogKeys,
	getSinglePlanSubscriptionOrThrow,
	SinglePlanGuardianSubscription,
} from './getSinglePlanSubscriptionOrThrow';
import { getIfDefined } from '@modules/nullAndUndefined';
import { ProductMatcher } from './matchFluent';
import { logger } from '@modules/routing/logger';

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
	billingPeriod: ValidTargetZuoraBillingPeriod;
};

export type SwitchInformation = {
	stage: Stage;
	input: ProductSwitchRequestBody;
	startNewTerm: boolean;
	targetContribution?: TargetContribution;
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

export type TargetContribution = {
	contributionAmount: number;
	chargeId: string;
};

export type ConcreteSinglePlanGuardianProduct<P extends ProductKey> = Omit<
	ProductCatalog[P],
	'ratePlans'
> & {
	ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>;
};

// /**
//  * gathers up all the relevant information and checks that we can switch
//  */
// function getValidSwitchOrThrow(
// 	input: ProductSwitchGenericRequestBody,
// 	singlePlanGuardianSubscription: SinglePlanGuardianSubscription,
// ): {
// 	zuoraBillingPeriod: ValidTargetZuoraBillingPeriod;
// 	targetGuardianProductName: ValidTargetGuardianProductName;
// } {
// 	const productKey: ProductKey =
// 		singlePlanGuardianSubscription.productCatalogKeys.productKey;
// 	if (!isSwitchFromSupported(productKey)) {
// 		throw new ValidationError(
// 			`unsupported source product for switching: ${productKey}`,
// 		);
// 	}
// 	const availableSwitchesForSub = switchesForProduct[productKey];
//
// 	const targetProduct: ValidTargetGuardianProductName = input.targetProduct;
//
// 	if (!isSwitchToSupported(availableSwitchesForSub, targetProduct)) {
// 		throw new ValidationError(
// 			`switch is not supported: from ${productKey} to ${targetProduct}`,
// 		);
// 	}
//
// 	const validBillingPeriodsForThisSwitch =
// 		availableSwitchesForSub[targetProduct];
//
// 	const billingPeriod = getIfDefined(
// 		objectValues(
// 			singlePlanGuardianSubscription.subscription.ratePlan.ratePlanCharges,
// 		)[0]?.billingPeriod,
// 		`No rate plan charge found on the rate plan ${prettyPrint(
// 			singlePlanGuardianSubscription.subscription.ratePlan,
// 		)}`,
// 	);
//
// 	if (
// 		billingPeriod === undefined ||
// 		!isValidSwitchableBillingPeriod(billingPeriod) ||
// 		!validBillingPeriodsForThisSwitch.includes(billingPeriod)
// 	) {
// 		throw new ValidationError(
// 			`switch is not supported: from ${productKey} to ${targetProduct} with billing period ${billingPeriod}`,
// 		);
// 	}
//
// 	return {
// 		targetGuardianProductName: targetProduct,
// 		zuoraBillingPeriod: billingPeriod,
// 	};
// }

function validGuardianCatalogKeysOrThrow<P extends ProductKey>(
	productCatalog: ProductCatalog,
	targetGuardianProductName: P,
	productRatePlanKey: string,
): AnyGuardianCatalogKeys {
	const hasRatePlan = <
		TKeys extends string | number | symbol,
		TMap extends Record<TKeys, unknown>,
	>(
		key: string | number | symbol,
		map: TMap,
	): key is Extract<keyof TMap, string | number | symbol> => {
		return key in map;
	};

	const ratePlans = productCatalog[targetGuardianProductName].ratePlans;
	if (!hasRatePlan(productRatePlanKey, ratePlans)) {
		throw new ValidationError(
			`Unsupported target rate plan key: ${String(
				productRatePlanKey,
			)} for product ${targetGuardianProductName}`,
		);
	}

	const validTargetProductCatalogKeys: AnyGuardianCatalogKeys = {
		productKey: targetGuardianProductName,
		productRatePlanKey,
	};
	return validTargetProductCatalogKeys;
}

const getCurrency = (contributionRatePlan: GuardianRatePlan): IsoCurrency => {
	const currency = getIfDefined(
		objectValues(contributionRatePlan.ratePlanCharges)[0]?.currency,
		'No currency found on the rate plan charge',
	);

	if (isSupportedCurrency(currency)) {
		// TODO move check to zod reader
		return currency;
	}
	throw new Error(`Unsupported currency ${currency}`);
};

const getSwitchInformation = async <P extends ProductKey>(
	stage: Stage,
	input: ProductSwitchGenericRequestBody,
	zuoraSubscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	zuoraCatalog: ZuoraCatalog, // maybe ProductCatalog alone has enough information?
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	const guardianSubscriptionParser = new GuardianSubscriptionParser(
		zuoraCatalog,
	);
	const subscriptionFilter =
		SubscriptionFilter.activeCurrentSubscriptionFilter(today);

	const singlePlanGuardianSubscription: SinglePlanGuardianSubscription =
		getSinglePlanSubscriptionOrThrow(
			subscriptionFilter.filterSubscription(
				guardianSubscriptionParser.parse(zuoraSubscription),
			),
		);

	// const { targetGuardianProductName, zuoraBillingPeriod } =
	// 	getValidSwitchOrThrow(input, singlePlanGuardianSubscription);

	const currency = getCurrency(
		singlePlanGuardianSubscription.subscription.ratePlan,
	);

	// TODO:delete comment - use ProductMatcher to derive source product info and valid target products
	const sourceSource = new ProductMatcher(
		productCatalog,
		'current product cannot be switched from',
	)
		.matchProduct('Contribution')
		.matchRatePlans(['Annual', 'Monthly'])
		.matchCharges({
			Contribution: (charge) => charge.id,
		})
		.buildRatePlanResult((ratePlan, chargesResult) => ({
			billingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			chargeIds: chargesResult,
		}))
		.buildProductResult((product, ratePlanResult) => ({
			...ratePlanResult,
			validTargetProducts: ['SupporterPlus'] as const,
		}))
		.run(singlePlanGuardianSubscription.productCatalogKeys);

	const sourceProduct1: CatalogInformation['sourceProduct'] = {
		productRatePlanId: sourceSource.productRatePlanId,
		chargeIds: getIfNonEmpty(sourceSource.chargeIds, 'no charges'),
	};

	const requestedTargetProduct: ProductKey = input.targetProduct;
	if (!isInList(sourceSource.validTargetProducts)(requestedTargetProduct))
		throw new ValidationError(
			`not a valid target product: ${input.targetProduct}`,
		);

	const validTargetProductCatalogKeys: AnyGuardianCatalogKeys =
		validGuardianCatalogKeysOrThrow(
			productCatalog,
			requestedTargetProduct,
			singlePlanGuardianSubscription.productCatalogKeys.productRatePlanKey,
		);

	logger.log(`switching from/to`, {
		from: singlePlanGuardianSubscription.productCatalogKeys,
		to: validTargetProductCatalogKeys,
	});

	const targetTarget = new ProductMatcher(
		productCatalog,
		'target product not supported',
	)
		.matchProduct('SupporterPlus')
		.matchRatePlans(['Monthly', 'Annual'])
		.matchCharges({
			Contribution: () => undefined,
			Subscription: (c) => c.id,
		})
		.buildRatePlanResult((ratePlan, charges) => ({
			billingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			contributionChargeId: ratePlan.charges.Contribution.id,
			chargeIds: charges.filter((c) => c !== undefined),
			catalogBasePrice: ratePlan.pricing[currency],
		}))
		.buildProductResult((product, ratePlanResultInner) => ({
			...ratePlanResultInner,
		}))
		.matchProduct('DigitalSubscription')
		.matchRatePlans(['Monthly', 'Annual'])
		.matchCharges({
			Subscription: (c) => c.id,
		})
		.buildRatePlanResult((ratePlan, charges) => ({
			billingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			contributionChargeId: undefined,
			chargeIds: charges.filter((c) => c !== undefined),
			catalogBasePrice: ratePlan.pricing[currency],
		}))
		.buildProductResult((product, ratePlanResultInner) => ({
			...ratePlanResultInner,
		}))
		.run(validTargetProductCatalogKeys);

	const targetProduct: CatalogInformation['targetProduct'] = {
		productRatePlanId: targetTarget.productRatePlanId,
		contributionChargeId: targetTarget.contributionChargeId,
		baseChargeIds: targetTarget.chargeIds,
	};

	const catalogInformation: CatalogInformation = {
		targetProduct,
		sourceProduct: sourceProduct1,
	};

	const catalogBasePrice: number = targetTarget.catalogBasePrice;

	const previousAmount = sumNumbers(
		objectValues(
			singlePlanGuardianSubscription.subscription.ratePlan.ratePlanCharges,
		).flatMap((c: RatePlanCharge) => (c.price !== null ? [c.price] : [])),
	);

	const zuoraBillingPeriod = sourceSource.billingPeriod;

	const maybeDiscount = await getDiscount(
		!!input.applyDiscountIfAvailable,
		previousAmount,
		catalogBasePrice,
		zuoraBillingPeriod,
		singlePlanGuardianSubscription.subscription.status,
		account.metrics.totalInvoiceBalance,
		stage,
		lazyBillingPreview,
	);

	const actualBasePrice = maybeDiscount?.discountedPrice ?? catalogBasePrice;

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

	let targetContribution: TargetContribution | undefined;
	if (catalogInformation.targetProduct.contributionChargeId === undefined) {
		if (contributionAmount === 0) targetContribution = undefined;
		else
			throw new ValidationError(
				`target product has a fixed price of ${actualBasePrice} so it isn't possible to charge ${userDesiredAmount}`,
			);
	} else
		targetContribution = {
			contributionAmount,
			chargeId: catalogInformation.targetProduct.contributionChargeId,
		};

	const subscriptionInformation: SubscriptionInformation = {
		accountNumber: singlePlanGuardianSubscription.subscription.accountNumber,
		subscriptionNumber:
			singlePlanGuardianSubscription.subscription.subscriptionNumber,
		previousProductName:
			singlePlanGuardianSubscription.subscription.ratePlan.productName,
		previousRatePlanName:
			singlePlanGuardianSubscription.subscription.ratePlan.ratePlanName,
		previousAmount,
		currency,
		billingPeriod: zuoraBillingPeriod,
	};

	const termStartDate = dayjs(
		singlePlanGuardianSubscription.subscription.termStartDate,
	).startOf('day');
	const startOfToday = today.startOf('day');
	const startNewTerm = termStartDate.isBefore(startOfToday);

	return {
		stage,
		input,
		startNewTerm,
		targetContribution,
		actualTotalPrice: contributionAmount + actualBasePrice,
		account: getAccountInformation(account),
		subscription: subscriptionInformation,
		catalog: catalogInformation,
		discount: maybeDiscount,
	} satisfies SwitchInformation;
};
export default getSwitchInformation;
