import { ValidationError } from '@modules/errors';
import {
	type IsoCurrency,
	isSupportedCurrency,
} from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import {
	CommonRatePlan,
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
import { sumNumbers } from '@modules/arrayFunctions';
import {
	isProductSupported,
	isTargetSupported,
	isValidTargetBillingPeriod,
	switchesForProduct,
	ValidTargetGuardianProductName,
	ValidTargetZuoraBillingPeriod,
} from '../validSwitches';
import { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	GuardianRatePlan,
	GuardianSubscription,
	GuardianSubscriptionBuilder,
} from './guardianSubscriptionBuilder';
import { SubscriptionFilter } from './subscriptionFilter';
import {
	AnyGuardianCatalogKeys,
	asSinglePlanGuardianSub,
	SinglePlanGuardianSubscription,
} from './singlePlanGuardianSub';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { foldCharges, RatePlanMatcher } from './matchFluent';
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

/**
 * Takes a low level subscription and returns a simplified sub with a single current plan, and its associated
 * guardian product catalog product
 */
class ZuoraToGuardianSubscriptionParser {
	constructor(
		zuoraCatalog: ZuoraCatalog,
		// productCatalog: ProductCatalog,
		today: dayjs.Dayjs,
	) {
		this.highLevelSubParser = new GuardianSubscriptionBuilder(zuoraCatalog);
		this.subscriptionFilter =
			SubscriptionFilter.activeCurrentSubscriptionFilter(today);
		// this.sss = new SSS(productCatalog);
	}

	private highLevelSubParser: GuardianSubscriptionBuilder;

	private subscriptionFilter: SubscriptionFilter;

	getSinglePlanGuardianSubscriptionOrThrow(
		zuoraSubscription: ZuoraSubscription,
	): SinglePlanGuardianSubscription {
		const highLevelSub: GuardianSubscription =
			this.highLevelSubParser.buildGuardianSubscription<ProductKey>(
				zuoraSubscription,
			);

		// const testing: GuardianRatePlan[] =
		// 	highLevelSub.products.NationalDelivery.EverydayPlus; //.map(c => c.ratePlanCharges.);
		// console.log(`todo ${testing}`);

		const subWithCurrentPlans: GuardianSubscription =
			this.subscriptionFilter.filterSubscription(highLevelSub);

		// got SupporterPlus Annual (keys for the product catalog) and then the whole object
		const singlePlanSubGeneric: SinglePlanGuardianSubscription<ProductKey> =
			asSinglePlanGuardianSub(subWithCurrentPlans);

		return singlePlanSubGeneric;
	}
}

function getSwitchOrThrow(
	zuoraCatalog: ZuoraCatalog,
	today: dayjs.Dayjs,
	zuoraSubscription: ZuoraSubscription,
	input: ProductSwitchGenericRequestBody,
): {
	singlePlanGuardianSubscription: SinglePlanGuardianSubscription;
	zuoraBillingPeriod: ValidTargetZuoraBillingPeriod;
	targetGuardianProductName: ValidTargetGuardianProductName;
} {
	const singlePlanGuardianSubscription: SinglePlanGuardianSubscription =
		new ZuoraToGuardianSubscriptionParser(
			zuoraCatalog,
			// productCatalog,
			today,
		).getSinglePlanGuardianSubscriptionOrThrow(zuoraSubscription);

	// const ttt: ConcreteSinglePlanGuardianProduct<
	// 	'Contribution' | 'SupporterPlus'
	// > = subAndProduct.singlePlanGuardianProduct;
	// const qqq: AnySinglePlanGuardianProduct = ttt;
	// console.log(qqq);
	// const fff: string = ttt.ratePlan.charges.Contribution.id;
	// const charges = qqq.ratePlan.charges;
	// const ggg: string | undefined = charges.Contribution?.id;
	// console.log(fff, ggg);

	const productKey =
		singlePlanGuardianSubscription.productCatalogKeys.productKey;
	// should be already checked by the type checker?
	if (!isProductSupported(productKey)) {
		throw new ValidationError(
			`unsupported source product for switching: ${productKey}`,
		);
	}
	const availableSwitchesForSub = switchesForProduct[productKey];

	const targetProduct: ValidTargetGuardianProductName = input.targetProduct;

	if (!isTargetSupported(availableSwitchesForSub, targetProduct)) {
		throw new ValidationError(
			`switch is not supported: from ${productKey} to ${targetProduct}`,
		);
	}

	const validBillingPeriodsForSwitch = availableSwitchesForSub[targetProduct];

	const billingPeriod = getIfDefined(
		objectValues(singlePlanGuardianSubscription.ratePlan.ratePlanCharges)[0]
			?.billingPeriod,
		`No rate plan charge found on the rate plan ${prettyPrint(
			singlePlanGuardianSubscription.ratePlan,
		)}`,
	);

	if (
		billingPeriod === undefined ||
		!isValidTargetBillingPeriod(billingPeriod) ||
		!validBillingPeriodsForSwitch.includes(billingPeriod)
	) {
		throw new ValidationError(
			`switch is not supported: from ${productKey} to ${targetProduct} with billing period ${billingPeriod}`,
		);
	}
	return {
		singlePlanGuardianSubscription,
		zuoraBillingPeriod: billingPeriod,
		targetGuardianProductName: targetProduct,
	};
}

function maybeGuardianCatalogKeys<P extends ProductKey>(
	productCatalog: ProductCatalog,
	targetGuardianProductName: P,
	productRatePlanKey: string,
): AnyGuardianCatalogKeys {
	const hasRatePlan = <
		TKeys extends string | number | symbol,
		TMap extends Record<TKeys, CommonRatePlan>,
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
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	zuoraCatalog: ZuoraCatalog, // maybe ProductCatalog alone has enough information?
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	const {
		singlePlanGuardianSubscription,
		zuoraBillingPeriod,
		targetGuardianProductName,
	} = getSwitchOrThrow(zuoraCatalog, today, subscription, input);

	const userInformation = getAccountInformation(account);

	const productRatePlanKey =
		singlePlanGuardianSubscription.productCatalogKeys.productRatePlanKey;
	const validTargetProductCatalogKeys: AnyGuardianCatalogKeys =
		maybeGuardianCatalogKeys(
			productCatalog,
			targetGuardianProductName,
			productRatePlanKey,
		);

	logger.log(`switching from/to`, {
		from: singlePlanGuardianSubscription.productCatalogKeys,
		to: targetGuardianProductName,
	});

	const currency = getCurrency(singlePlanGuardianSubscription.ratePlan);

	const targetProduct = new RatePlanMatcher<
		CatalogInformation['targetProduct'] & { catalogBasePrice: number }
	>(productCatalog, 'arpp')
		.on('SupporterPlus', (c) =>
			c.onMany(['Monthly', 'Annual'], (ratePlan) => {
				const { Contribution, ...nonContributionCharges } = ratePlan.charges;

				return {
					productRatePlanId: ratePlan.id,
					baseChargeIds: objectValues(nonContributionCharges).map(
						(charge) => charge.id,
					),
					contributionChargeId: ratePlan.charges.Contribution.id,
					catalogBasePrice: ratePlan.pricing[currency],
				};
			}),
		)
		.on('DigitalSubscription', (c) =>
			c.onMany(['Monthly', 'Annual'], (ratePlan) => {
				return {
					productRatePlanId: ratePlan.id,
					baseChargeIds: objectValues(ratePlan.charges).map(
						(charge) => charge.id,
					),
					contributionChargeId: undefined,
					catalogBasePrice: ratePlan.pricing[currency],
				};
			}),
		)
		.run(validTargetProductCatalogKeys).ratePlanResult;

	const sourceProduct: CatalogInformation['sourceProduct'] =
		new RatePlanMatcher<CatalogInformation['sourceProduct']>(
			productCatalog,
			'arrgh',
		)
			.on('SupporterPlus', (c) =>
				c.onMany(['Annual', 'Monthly'], (ratePlan) => {
					return {
						productRatePlanId: ratePlan.id,
						chargeIds: foldCharges(ratePlan.charges)((charge) => charge.id),
					};
				}),
			)
			.on('Contribution', (c) =>
				c.onMany(['Annual', 'Monthly'], (ratePlan) => {
					return {
						productRatePlanId: ratePlan.id,
						chargeIds: foldCharges(ratePlan.charges)((charge) => charge.id),
					};
				}),
			)
			.run(singlePlanGuardianSubscription.productCatalogKeys).ratePlanResult;

	const catalogInformation: CatalogInformation = {
		targetProduct,
		sourceProduct,
	};

	const catalogBasePrice: number = targetProduct.catalogBasePrice;

	const previousAmount = sumNumbers(
		objectValues(
			singlePlanGuardianSubscription.ratePlan.ratePlanCharges,
		).flatMap((c: RatePlanCharge) => (c.price !== null ? [c.price] : [])),
	);

	const maybeDiscount = await getDiscount(
		!!input.applyDiscountIfAvailable,
		previousAmount,
		catalogBasePrice,
		zuoraBillingPeriod,
		subscription.status,
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
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: singlePlanGuardianSubscription.ratePlan.productName,
		previousRatePlanName: singlePlanGuardianSubscription.ratePlan.ratePlanName,
		previousAmount,
		currency,
		billingPeriod: zuoraBillingPeriod,
	};

	const termStartDate = dayjs(subscription.termStartDate).startOf('day');
	const startOfToday = today.startOf('day');
	const startNewTerm = termStartDate.isBefore(startOfToday);

	return {
		stage,
		input,
		startNewTerm,
		targetContribution,
		actualTotalPrice: contributionAmount + actualBasePrice,
		account: userInformation,
		subscription: subscriptionInformation,
		catalog: catalogInformation,
		discount: maybeDiscount,
	} satisfies SwitchInformation;
};
export default getSwitchInformation;
