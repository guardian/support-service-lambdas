import type { BillingPeriod } from '@modules/billingPeriod';
import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { isSupportedCurrency } from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import {
	BillingPeriodAlignment,
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
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from './schemas';
import {
	objectEntries,
	objectFromEntries,
	objectJoin,
	objectKeys,
} from '@modules/objectFunctions';
import {
	getSingleOrThrow,
	mapValues,
	partitionByValueType,
	sum,
} from '@modules/arrayFunctions';
import {
	switchesForProduct,
	validSwitches,
	ValidTargetProduct,
} from './validSwitches';
import {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';

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

type ZuoraCatalogIdLookup = Record<
	string,
	{
		id: string;
		name: string;
		description: string;
		effectiveStartDate: string;
		effectiveEndDate: string;
		productRatePlans: Record<
			string,
			{
				id: string;
				status: string;
				name: string;
				effectiveStartDate: string;
				effectiveEndDate: string;
				TermType__c: string | null;
				DefaultTerm__c: string | null;
				productRatePlanCharges: Record<string, ZuoraProductRatePlanCharge>;
			}
		>;
	}
>;

// useful for getting more info about a subscription from its product*Id fields
function buildCatalogIdLookup(catalog: ZuoraCatalog): ZuoraCatalogIdLookup {
	return objectFromEntries(
		catalog.products.map((product: CatalogProduct) => {
			const productRatePlans = objectFromEntries(
				product.productRatePlans.map((prp: ZuoraProductRatePlan) => {
					const productRatePlanCharges = objectFromEntries(
						prp.productRatePlanCharges.map(
							(prpc: ZuoraProductRatePlanCharge) => [prpc.id, prpc],
						),
					);
					return [prp.id, { ...prp, productRatePlanCharges }];
				}),
			);
			return [product.id, { ...product, productRatePlans }];
		}),
	);
}

type HighLevelSubscription = {
	id: string;
	accountNumber: string;
	subscriptionNumber: string;
	status: string;
	contractEffectiveDate: Date;
	serviceActivationDate: Date;
	customerAcceptanceDate: Date;
	subscriptionStartDate: Date;
	subscriptionEndDate: Date;
	lastBookingDate: Date;
	termStartDate: Date;
	termEndDate: Date;
	ratePlans: Record<
		string,
		{
			id: string;
			productName: string;
			ratePlanName: string;
			lastChangeType?: string;
			product: {
				id: string;
				name: string;
				description: string;
				effectiveStartDate: string;
				effectiveEndDate: string;
				productRatePlans: Record<
					string,
					{
						id: string;
						status: string;
						name: string;
						effectiveStartDate: string;
						effectiveEndDate: string;
						TermType__c: string | null;
						DefaultTerm__c: string | null;
						productRatePlanCharges: Record<string, ZuoraProductRatePlanCharge>;
					}
				>;
			};
			productRatePlan: {
				id: string;
				status: string;
				name: string;
				effectiveStartDate: string;
				effectiveEndDate: string;
				TermType__c: string | null;
				DefaultTerm__c: string | null;
				productRatePlanCharges: Record<string, ZuoraProductRatePlanCharge>;
			};
			ratePlanCharges: Record<
				string,
				{
					id: string;
					number: string;
					name: string;
					type: string;
					model: string;
					currency: string;
					effectiveStartDate: Date;
					effectiveEndDate: Date;
					billingPeriod: BillingPeriod | null;
					processedThroughDate: Date;
					chargedThroughDate: Date | null;
					upToPeriodsType: string | null;
					upToPeriods: number | null;
					price: number | null;
					discountPercentage: number | null;
					billingPeriodAlignment: BillingPeriodAlignment;
					productRatePlanCharge: {
						id: string;
						name: string;
						type: string;
						model: string;
						pricing: Array<{
							currency: string;
							price: number | null;
							discountPercentage: number | null;
						}>;
						endDateCondition: string;
						billingPeriod: string | null;
						triggerEvent: string;
						description: string | null;
					};
				}
			>;
		}
	>;
};

export const asHighLevelSub: (
	catalog: ZuoraCatalog,
	subscription: ZuoraSubscription,
) => HighLevelSubscription = (
	catalog: ZuoraCatalog,
	subscription: ZuoraSubscription,
) => {
	const products = buildCatalogIdLookup(catalog);

	const mergedRatePlans = objectFromEntries(
		subscription.ratePlans.map((rp) => {
			const product = getIfDefined(
				products[rp.productId],
				'unknown product: ' + rp.productId,
			);
			const productRatePlan = getIfDefined(
				product.productRatePlans[rp.productRatePlanId],
				'unknown product rate plan: ' + rp.productRatePlanId,
			);
			const ratePlanChargesByPRPCId = objectFromEntries(
				rp.ratePlanCharges.map((rpc) => [rpc.productRatePlanChargeId, rpc]),
			);

			const mergedRatePlanCharges = objectFromEntries(
				objectJoin(
					productRatePlan.productRatePlanCharges,
					ratePlanChargesByPRPCId,
				).map(([prpc, rpc]) => {
					const { productRatePlanChargeId, ...restRpc } = rpc;
					const productRatePlanChargeKey = getProductRatePlanChargeKey(
						prpc.name,
					);
					return [
						productRatePlanChargeKey,
						{
							...restRpc,
							productRatePlanCharge: {
								...prpc,
								key: productRatePlanChargeKey,
							},
						},
					];
				}),
			);
			const { ratePlanCharges, productId, productRatePlanId, ...restRp } = rp;
			const zuoraProductKey = getZuoraProductKey(product.name);
			const productRatePlanKey = getProductRatePlanKey(productRatePlan.name);
			return [
				zuoraProductKey + '-' + productRatePlanKey, // FIXME keep them separate
				{
					...restRp,
					product,
					productRatePlan,
					ratePlanCharges: mergedRatePlanCharges,
				},
			];
		}),
	);
	const { ratePlans, ...restSubscription } = subscription;

	return {
		...restSubscription,
		ratePlans: mergedRatePlans,
	}; // later can add in some extra props from the product-catalog if we want
};

export const getRatePlanToRemove = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
	s: (typeof validSwitches)[ValidTargetProduct],
) => {
	const sourceProductRatePlanIds = s.validBillingPeriods.map(
		(bp) => productCatalog[s.sourceProduct].ratePlans[bp].id,
	);
	const contributionRatePlan = subscription.ratePlans.find(
		(ratePlan) =>
			ratePlan.lastChangeType !== 'Remove' &&
			sourceProductRatePlanIds.includes(ratePlan.productRatePlanId),
	);
	if (contributionRatePlan !== undefined) {
		return contributionRatePlan;
	}
	if (subscriptionHasAlreadySwitched(productCatalog, subscription, s)) {
		throw new ValidationError(
			`The subscription ${subscription.subscriptionNumber} has already been switched to supporter plus: ${prettyPrint(subscription)}`,
		);
	}
	throw new ReferenceError(
		`Subscription ${subscription.subscriptionNumber} does not contain an active contribution rate plan: ${prettyPrint(subscription)}`,
	);
};

export const subscriptionHasAlreadySwitched = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
	s: (typeof validSwitches)[ValidTargetProduct],
) => {
	const sourceProductRatePlanIds = s.validBillingPeriods.map(
		(bp) => productCatalog[s.sourceProduct].ratePlans[bp].id,
	);
	const targetProductRatePlanIds = s.validBillingPeriods.map(
		(bp) => productCatalog[s.targetProduct].ratePlans[bp].id,
	);
	const previouslyRemovedSourceProduct = subscription.ratePlans.find(
		(ratePlan) =>
			ratePlan.lastChangeType === 'Remove' &&
			sourceProductRatePlanIds.includes(ratePlan.productRatePlanId),
	);
	const currentTargetProduct = subscription.ratePlans.find(
		(ratePlan) =>
			ratePlan.lastChangeType !== 'Remove' &&
			targetProductRatePlanIds.includes(ratePlan.productRatePlanId),
	);
	return (
		previouslyRemovedSourceProduct !== undefined &&
		currentTargetProduct !== undefined
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

function filterSubscription(
	highLevelSub: HighLevelSubscription,
	ratePlanDiscardReason: (
		rp: HighLevelSubscription['ratePlans'][string],
	) => string | undefined,
	chargeDiscardReason: (
		rpc: HighLevelSubscription['ratePlans'][string]['ratePlanCharges'][string],
	) => string | undefined,
): { discarded: string; subscription: HighLevelSubscription } {
	const [discarded, ratePlans] = partitionByValueType(
		mapValues(highLevelSub.ratePlans, (rp) => {
			const ratePlanDiscardReason1 = ratePlanDiscardReason(rp);
			if (ratePlanDiscardReason1 !== undefined) return ratePlanDiscardReason1;
			const [errors, filteredCharges] = partitionByValueType(
				mapValues(
					rp.ratePlanCharges,
					(
						rpc: HighLevelSubscription['ratePlans'][string]['ratePlanCharges'][string],
					) => {
						const chargeDiscardReason1 = chargeDiscardReason(rpc);
						return chargeDiscardReason1 !== undefined
							? chargeDiscardReason1
							: rpc;
					},
				),
				(o) => typeof o === 'string',
			);
			return objectKeys(filteredCharges).length > 0
				? { ...rp, ratePlanCharges: filteredCharges }
				: 'missing: ' + JSON.stringify(errors);
		}),
		(o) => typeof o === 'string',
	);
	return {
		discarded: JSON.stringify(discarded),
		subscription: {
			...highLevelSub,
			ratePlans: ratePlans,
		},
	};
}

export const getSwitchInformation = async (
	stage: Stage,
	input: ProductSwitchGenericRequestBody,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	zuoraCatalog: ZuoraCatalog,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	const highLevelSub = asHighLevelSub(zuoraCatalog, subscription);
	const { discarded, subscription: currentSub } = filterSubscription(
		highLevelSub,
		(rp) => (rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined),
		(rpc) =>
			rpc.effectiveStartDate > today.toDate()
				? 'plan has not started'
				: rpc.effectiveEndDate <= today.toDate()
					? 'plan has finished'
					: undefined,
	);
	// got SupporterPlus Annual (keys for the product catalog) and then the whole object
	const { productKey, ratePlanKey, v } = getSingleOrThrow(
		objectEntries(currentSub.ratePlans).map(([k, v]) => {
			const [product, ratePlan] = k.split('-');
			return {
				productKey: getIfDefined(product, 'invalid key: ' + k),
				ratePlanKey: getIfDefined(ratePlan, 'invalid key: ' + k),
				v,
			};
		}),
		(msg) =>
			new ValidationError("subscription didn't have a single product: " + msg),
	);

	const switchToDo = switchesForProduct[productKey]?.[input.targetProduct];

	const userInformation = getAccountInformation(account);
	const switchConfiguration: (typeof validSwitches)[typeof input.targetProduct] =
		validSwitches[input.targetProduct];

	const ratePlanToRemove = getRatePlanToRemove(
		productCatalog,
		subscription,
		switchConfiguration,
	);

	const billingPeriod = getIfDefined(
		ratePlanToRemove.ratePlanCharges[0]?.billingPeriod,
		`No rate plan charge found on the rate plan ${prettyPrint(
			ratePlanToRemove,
		)}`,
	);
	const currency = getCurrency(ratePlanToRemove);

	const catalogInformation = getCatalogInformation(
		productCatalog,
		switchConfiguration,
		billingPeriod,
		currency,
	);

	const existingChargePriceMap = objectFromEntries(
		ratePlanToRemove.ratePlanCharges.flatMap((c) =>
			c.price !== null ? [[c.productRatePlanChargeId, c.price]] : [],
		),
	);

	const previousAmount = sum(catalogInformation.sourceProduct.chargeIds, (c) =>
		getIfDefined(
			existingChargePriceMap[c],
			'missing charge in existing sub: ' + c,
		),
	);

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
		contributionAmount,
		actualTotalPrice: contributionAmount + actualBasePrice,
		account: userInformation,
		subscription: subscriptionInformation,
		catalog: catalogInformation,
		discount: maybeDiscount,
	};
};
