import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import {
	CommonRatePlan,
	ProductCatalog,
	ProductCatalogHelper,
	ProductKey,
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
import type { CatalogInformation } from '../catalogInformation';
import { getCatalogInformation } from '../catalogInformation';
import type { Discount } from '../discounts';
import { getDiscount } from '../discounts';
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from '../schemas';
import {
	objectEntries,
	objectKeys,
	objectValues,
} from '@modules/objectFunctions';
import {
	getSingleOrThrow,
	mapValues,
	partitionByType,
	partitionByValueType,
	sumNumbers,
} from '@modules/arrayFunctions';
import {
	isValidTargetBillingPeriod,
	switchesForProduct,
	ValidTargetBillingPeriod,
} from '../validSwitches';
import { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { logger } from '@modules/routing/logger';
import {
	HighLevelSubParser,
	JoinedRatePlan,
	MergedSubscription,
} from './highLevelSubParser';

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
	billingPeriod: ValidTargetBillingPeriod;
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

// export const getRatePlanToRemove = (
// 	productCatalog: ProductCatalog,
// 	subscription: ZuoraSubscription,
// ) => {
// 	const sourceProductRatePlanIds = s.validBillingPeriods.map(
// 		(bp) => productCatalog[s.sourceProduct].ratePlans[bp].id,
// 	);
// 	const contributionRatePlan = subscription.ratePlans.find(
// 		(ratePlan) =>
// 			ratePlan.lastChangeType !== 'Remove' &&
// 			sourceProductRatePlanIds.includes(ratePlan.productRatePlanId),
// 	);
// 	if (contributionRatePlan !== undefined) {
// 		return contributionRatePlan;
// 	}
// 	if (subscriptionHasAlreadySwitched(productCatalog, subscription, s)) {
// 		throw new ValidationError(
// 			`The subscription ${subscription.subscriptionNumber} has already been switched to supporter plus: ${prettyPrint(subscription)}`,
// 		);
// 	}
// 	throw new ReferenceError(
// 		`Subscription ${subscription.subscriptionNumber} does not contain an active contribution rate plan: ${prettyPrint(subscription)}`,
// 	);
// };

// export const subscriptionHasAlreadySwitched = (
// 	productCatalog: ProductCatalog,
// 	subscription: ZuoraSubscription,
// 	s: (typeof validSwitches)[ValidTargetProduct],
// ) => {
// 	const sourceProductRatePlanIds = s.validBillingPeriods.map(
// 		(bp) => productCatalog[s.sourceProduct].ratePlans[bp].id,
// 	);
// 	const targetProductRatePlanIds = s.validBillingPeriods.map(
// 		(bp) => productCatalog[s.targetProduct].ratePlans[bp].id,
// 	);
// 	const previouslyRemovedSourceProduct = subscription.ratePlans.find(
// 		(ratePlan) =>
// 			ratePlan.lastChangeType === 'Remove' &&
// 			sourceProductRatePlanIds.includes(ratePlan.productRatePlanId),
// 	);
// 	const currentTargetProduct = subscription.ratePlans.find(
// 		(ratePlan) =>
// 			ratePlan.lastChangeType !== 'Remove' &&
// 			targetProductRatePlanIds.includes(ratePlan.productRatePlanId),
// 	);
// 	return (
// 		previouslyRemovedSourceProduct !== undefined &&
// 		currentTargetProduct !== undefined
// 	);
// };

// const getCurrency = (contributionRatePlan: RatePlan): IsoCurrency => {
// 	const currency = getIfDefined(
// 		contributionRatePlan.ratePlanCharges[0]?.currency,
// 		'No currency found on the rate plan charge',
// 	);
//
// 	if (isSupportedCurrency(currency)) {
// 		return currency;
// 	}
// 	throw new Error(`Unsupported currency ${currency}`);
// };
//
// class OldHighLevelSubscriptionFilter {
// 	constructor(
// 		private ratePlanDiscardReason: (
// 			rp: HighLevelSubscription['ratePlans'][string],
// 		) => string | undefined,
// 		private chargeDiscardReason: (
// 			rpc: HighLevelSubscription['ratePlans'][string]['ratePlanCharges'][string],
// 		) => string | undefined,
// 	) {}
//
// 	/**
// 	 * this filters out all Removed rate plans and charges outside of their effective dates
// 	 * @param today
// 	 */
// 	static activeCurrentSubscriptionFilter(
// 		today: dayjs.Dayjs,
// 	): SubscriptionFilter {
// 		return new SubscriptionFilter(
// 			(rp) => (rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined),
// 			(rpc) =>
// 				rpc.effectiveStartDate > today.toDate()
// 					? 'plan has not started'
// 					: rpc.effectiveEndDate <= today.toDate()
// 						? 'plan has finished'
// 						: undefined,
// 		);
// 	}
//
// 	private filterCharges(rp: HighLevelSubscription['ratePlans'][string]) {
// 		const [errors, filteredCharges] = partitionByValueType(
// 			mapValues(
// 				rp.ratePlanCharges,
// 				(
// 					rpc: HighLevelSubscription['ratePlans'][string]['ratePlanCharges'][string],
// 				) => {
// 					const chargeDiscardReason1 = this.chargeDiscardReason(rpc);
// 					return chargeDiscardReason1 !== undefined
// 						? chargeDiscardReason1
// 						: rpc;
// 				},
// 			),
// 			(o) => typeof o === 'string',
// 		);
// 		return { errors, filteredCharges };
// 	}
//
// 	private filterRatePlans(highLevelSub: HighLevelSubscription) {
// 		const [discarded, ratePlans] = partitionByValueType(
// 			mapValues(highLevelSub.ratePlans, (rp) => {
// 				const maybeDiscardWholePlan = this.ratePlanDiscardReason(rp);
// 				if (maybeDiscardWholePlan !== undefined) return maybeDiscardWholePlan;
//
// 				const { errors, filteredCharges } = this.filterCharges(rp);
//
// 				const maybeAllChargesDiscarded =
// 					objectKeys(filteredCharges).length === 0
// 						? 'missing: ' + JSON.stringify(errors)
// 						: undefined;
// 				if (maybeAllChargesDiscarded !== undefined)
// 					return maybeAllChargesDiscarded;
// 				return { ...rp, ratePlanCharges: filteredCharges };
// 			}),
// 			(o) => typeof o === 'string',
// 		);
// 		return { discarded, ratePlans };
// 	}
//
// 	filterSubscription(highLevelSub: HighLevelSubscription): {
// 		discarded: string;
// 		subscription: HighLevelSubscription;
// 	} {
// 		const { discarded, ratePlans } = this.filterRatePlans(highLevelSub);
// 		return {
// 			discarded: JSON.stringify(discarded),
// 			subscription: {
// 				...highLevelSub,
// 				ratePlans: ratePlans,
// 			},
// 		};
// 	}
// }

class SubscriptionFilter {
	constructor(
		private ratePlanDiscardReason: (
			rp: JoinedRatePlan, //MergedSubscription['joinedByProduct'][ProductKey][string],
		) => string | undefined,
		private chargeDiscardReason: (rpc: RatePlanCharge) => string | undefined,
	) {}

	/**
	 * this filters out all Removed rate plans and charges outside of their effective dates
	 * @param today
	 */
	static activeCurrentSubscriptionFilter(
		today: dayjs.Dayjs,
	): SubscriptionFilter {
		return new SubscriptionFilter(
			(rp) => (rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined),
			(rpc) =>
				rpc.effectiveStartDate > today.toDate()
					? 'plan has not started'
					: rpc.effectiveEndDate <= today.toDate()
						? 'plan has finished'
						: undefined,
		);
	}

	private filterCharges(charges: Record<string, RatePlanCharge>) {
		const [errors, filteredCharges] = partitionByValueType(
			mapValues(charges, (rpc: RatePlanCharge) => {
				const chargeDiscardReason1 = this.chargeDiscardReason(rpc);
				return chargeDiscardReason1 !== undefined ? chargeDiscardReason1 : rpc;
			}),
			(o) => typeof o === 'string',
		);
		return { errors, filteredCharges };
	}

	private filterRatePlanList(guardianSubRatePlans: JoinedRatePlan[]): {
		discarded: string[];
		ratePlans: JoinedRatePlan[];
	} {
		const [discarded, ratePlans] = partitionByType(
			guardianSubRatePlans.map((rp: JoinedRatePlan) => {
				const maybeDiscardWholePlan = this.ratePlanDiscardReason(rp);
				if (maybeDiscardWholePlan !== undefined) return maybeDiscardWholePlan;

				const { errors, filteredCharges } = this.filterCharges(
					rp.guardianChargeKeyToSubCharge,
				);

				const maybeAllChargesDiscarded =
					objectKeys(filteredCharges).length === 0
						? 'all charges discarded: ' + JSON.stringify(errors)
						: undefined;
				if (maybeAllChargesDiscarded !== undefined)
					return maybeAllChargesDiscarded;
				return { ...rp, ratePlanCharges: filteredCharges };
			}),
			(o) => typeof o === 'string',
		);
		return { discarded, ratePlans };
	}

	private filterRatePlans(
		joinedByProduct: Record<ProductKey, Record<string, JoinedRatePlan[]>>,
	): Record<ProductKey, Record<string, JoinedRatePlan[]>> {
		return mapValues(joinedByProduct, (jbp: Record<string, JoinedRatePlan[]>) =>
			mapValues(jbp, (guardianSubRatePlans: JoinedRatePlan[]) => {
				const { discarded, ratePlans } =
					this.filterRatePlanList(guardianSubRatePlans);
				if (discarded.length > 0) logger.log(`discarded rateplans:`, discarded); // could be spammy?
				return ratePlans;
			}),
		);
	}

	filterSubscription(highLevelSub: MergedSubscription): MergedSubscription {
		const { joinedByProduct, ...restSubscription } = highLevelSub;
		const ratePlans = this.filterRatePlans(joinedByProduct);
		return {
			...restSubscription,
			joinedByProduct: ratePlans,
		};
	}
}

export type TargetContribution = {
	contributionAmount: number;
	chargeId: string;
};

const getSwitchInformation = async (
	stage: Stage,
	input: ProductSwitchGenericRequestBody,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	zuoraCatalog: ZuoraCatalog, // maybe ProductCatalog alone has enough information?
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	const highLevelSubParser = new HighLevelSubParser(zuoraCatalog);
	const highLevelSub: MergedSubscription =
		highLevelSubParser.asHighLevelSub(subscription);
	const subscriptionFilter =
		SubscriptionFilter.activeCurrentSubscriptionFilter(today);
	const subWithCurrentPlans =
		subscriptionFilter.filterSubscription(highLevelSub);
	// got SupporterPlus Annual (keys for the product catalog) and then the whole object
	const { productKey, productRatePlanKey, ratePlans } = getSingleOrThrow(
		objectEntries(subWithCurrentPlans.joinedByProduct).flatMap(
			([productKey, ratePlan]) => {
				return objectEntries(ratePlan).map(
					([productRatePlanKey, ratePlans]) => {
						return {
							productKey,
							productRatePlanKey,
							ratePlans,
						};
					},
				);
			},
		),
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);
	logger.log('this is a ', productKey, productRatePlanKey);

	const isProductSupported = (
		productKeyToCheck: ProductKey,
	): productKeyToCheck is keyof typeof switchesForProduct =>
		productKeyToCheck in switchesForProduct;

	if (!isProductSupported(productKey)) {
		throw new ValidationError(
			`unsupported source product for switching: ${productKey}`,
		);
	}

	const switchToDo = switchesForProduct[productKey][input.targetProduct];
	const billingPeriod = (
		new ProductCatalogHelper(productCatalog).getProductRatePlan(
			productKey,
			productRatePlanKey as ProductRatePlanKey<typeof productKey>,
		) as CommonRatePlan
	).billingPeriod; //FIXME
	if (
		switchToDo === undefined ||
		billingPeriod === undefined ||
		!isValidTargetBillingPeriod(billingPeriod)
	) {
		throw new ValidationError(
			`switch is not supported: from ${productKey} to ${input.targetProduct} with billing period ${billingPeriod}`,
		);
	}

	const userInformation = getAccountInformation(account);
	// const switchConfiguration: (typeof validSwitches)[typeof input.targetProduct] =
	// 	validSwitches[input.targetProduct];
	const ratePlanToRemove = getSingleOrThrow(
		ratePlans,
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);
	const currency: IsoCurrency = account.metrics.currency as IsoCurrency; //FIXME
	// const ratePlanToRemove = getRatePlanToRemove(
	// 	productCatalog,
	// 	subscription,
	// 	switchConfiguration,
	// );

	// const billingPeriod = getIfDefined(
	// 	ratePlanToRemove.ratePlanCharges[0]?.billingPeriod,
	// 	`No rate plan charge found on the rate plan ${prettyPrint(
	// 		ratePlanToRemove,
	// 	)}`,
	// );
	// const currency = getCurrency(ratePlanToRemove);

	const catalogInformation = getCatalogInformation(
		productCatalog,
		input.targetProduct,
		productKey,
		billingPeriod,
		currency,
	);

	const previousAmount = sumNumbers(
		objectValues(ratePlanToRemove.guardianChargeKeyToSubCharge).flatMap(
			(c: RatePlanCharge) => (c.price !== null ? [c.price] : []),
		),
	);

	// const previousAmount = sum(catalogInformation.sourceProduct.chargeIds, (c) =>
	// 	getIfDefined(
	// 		existingChargePriceMap[c],
	// 		'missing charge in existing sub: ' + c,
	// 	),
	// );

	const maybeDiscount = await getDiscount(
		!!input.applyDiscountIfAvailable,
		previousAmount,
		catalogInformation.targetProduct.catalogBasePrice,
		billingPeriod,
		subscription.status,
		account.metrics.totalInvoiceBalance,
		stage,
		lazyBillingPreview,
	);

	const actualBasePrice =
		maybeDiscount?.discountedPrice ??
		catalogInformation.targetProduct.catalogBasePrice;

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

	const subscriptionInformation = {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: ratePlanToRemove.productName,
		previousRatePlanName: ratePlanToRemove.ratePlanName,
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
		targetContribution,
		actualTotalPrice: contributionAmount + actualBasePrice,
		account: userInformation,
		subscription: subscriptionInformation,
		catalog: catalogInformation,
		discount: maybeDiscount,
	};
};
export default getSwitchInformation;
