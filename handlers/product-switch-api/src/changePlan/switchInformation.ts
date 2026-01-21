import { ValidationError } from '@modules/errors';
import {
	type IsoCurrency,
	isSupportedCurrency,
} from '@modules/internationalisation/currency';
import { Lazy } from '@modules/lazy';
import {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import { RatePlanCharge, ZuoraAccount } from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
	annualContribHalfPriceSupporterPlusForOneYear,
	Discount,
} from '../discounts';
import type { ProductSwitchGenericRequestBody } from '../schemas';
import { objectValues } from '@modules/objectFunctions';
import { getIfNonEmpty, isInList, sumNumbers } from '@modules/arrayFunctions';
import { ValidTargetZuoraBillingPeriod } from '../validSwitches';
import {
	AnyGuardianCatalogKeys,
	GuardianSubscriptionWithKeys,
	SinglePlanGuardianSubscription,
} from './getSinglePlanSubscriptionOrThrow';
import { ProductMatcher } from './matchFluent';
import { logger } from '@modules/routing/logger';

export type AccountInformation = {
	id: string; // create payment
	identityId: string; // email, supporter product data
	emailAddress: string; // email
	firstName: string; // email
	lastName: string; // email
	defaultPaymentMethodId: string; // create payment
};

export type SubscriptionInformation = {
	accountNumber: string; // order
	subscriptionNumber: string;
	previousProductName: string; // sf tracking
	previousRatePlanName: string; //sf tracking
	previousAmount: number; //sf tracking
	currency: IsoCurrency; // email
	billingPeriod: ValidTargetZuoraBillingPeriod; // email, FIXME supporter product data(need TARGET rate plan name)
};

export type CatalogInformation = {
	targetProduct: {
		productRatePlanId: string; // order, supporter product data
		baseChargeIds: string[]; // adjust invoice, build response // used to find the price and service end date (next payment date) from the preview invoice, also to find and adjust out any charge less than 0.50
		contributionCharge: { id: string; contributionAmount: number } | undefined; // TBC compile errors // used to find the price from the preview invoice as above, also to do the chargeOverrides in the order to set the additional amount to take
	};
	sourceProduct: {
		productRatePlanId: string; // order, find if charged through date are the same and are is today(todo can return it from single plan sub)
		chargeIds: [string, ...string[]]; // filter invoice refund items, find if charged through date are the same and are is today(todo can return it from single plan sub) // needed to find the refund amount in the invoice (todo total it) and the charged through date (todo toSet it and check it's unique)
	};
};

export type SwitchInformation = {
	startNewTerm: boolean; // order
	targetContribution?: TargetContribution; // order
	actualTotalPrice: number; // email, sf tracking
	account: AccountInformation;
	subscription: SubscriptionInformation;
	catalog: CatalogInformation;
	discount?: Discount; // order (product rate plan id), return to client
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

class GuardianKeysValidator {
	constructor(private productCatalog: ProductCatalog) {}

	validateOrThrow<P extends ProductKey>(
		targetGuardianProductName: P,
		productRatePlanKey: string,
	): AnyGuardianCatalogKeys {
		const ratePlans = this.productCatalog[targetGuardianProductName].ratePlans;
		if (!this.hasRatePlan(productRatePlanKey, ratePlans)) {
			throw new ValidationError(
				`Unsupported target rate plan key: ${String(
					productRatePlanKey,
				)} for product ${targetGuardianProductName}`,
			);
		}

		return {
			productKey: targetGuardianProductName,
			productRatePlanKey,
		};
	}

	hasRatePlan = <
		TKeys extends string | number | symbol,
		TMap extends Record<TKeys, unknown>,
	>(
		key: string | number | symbol,
		map: TMap,
	): key is Extract<keyof TMap, string | number | symbol> => {
		return key in map;
	};
}

const getCurrency = (currency: string): IsoCurrency => {
	if (!isSupportedCurrency(currency)) {
		// TODO move check to zod reader
		throw new Error(`Unsupported currency ${currency}`);
	}
	return currency;
};

function buildSourceProductMatcher(productCatalog: ProductCatalog) {
	return new ProductMatcher(
		productCatalog,
		'current product cannot be switched from',
	)
		.matchProduct('Contribution')
		.matchRatePlans(['Annual', 'Monthly'])
		.mapCharges((charge) => charge.id)
		.buildRatePlanResult((ratePlan, chargesResult) => ({
			sourceZuoraBillingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			chargeIds: getIfNonEmpty(chargesResult, 'no charges'),
		}))
		.buildProductResult(
			(
				product,
				{ sourceZuoraBillingPeriod, productRatePlanId, chargeIds },
			) => ({
				sourceProduct: {
					productRatePlanId,
					chargeIds,
				} satisfies CatalogInformation['sourceProduct'],
				sourceZuoraBillingPeriod,
				validTargetProducts: ['SupporterPlus'] as const,
			}),
		)
		.matchProduct('SupporterPlus')
		.matchRatePlans(['Annual', 'Monthly'])
		.mapCharges((charge) => charge.id)
		.buildRatePlanResult((ratePlan, chargesResult) => ({
			sourceZuoraBillingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			chargeIds: getIfNonEmpty(chargesResult, 'no charges'),
		}))
		.buildProductResult(
			(
				product,
				{ sourceZuoraBillingPeriod, productRatePlanId, chargeIds },
			) => ({
				sourceProduct: {
					productRatePlanId,
					chargeIds,
				} satisfies CatalogInformation['sourceProduct'],
				sourceZuoraBillingPeriod,
				validTargetProducts: ['DigitalSubscription'] as const,
			}),
		);
}

function buildTargetProductMatcher(
	productCatalog: ProductCatalog,
	stage: Stage,
	currency: IsoCurrency,
	userRequestedAmount: number | undefined,
	previousAmount: number,
	generallyEligibleForDiscount: boolean,
) {
	return new ProductMatcher(productCatalog, 'target product not supported')
		.matchProduct('SupporterPlus')
		.matchRatePlans(['Monthly', 'Annual'])
		.matchCharges({
			Contribution: () => undefined,
			Subscription: (c) => c.id,
		})
		.buildRatePlanResult((ratePlan, charges) => {
			const targetCatalogBasePrice = ratePlan.pricing[currency];
			const discountDetails =
				annualContribHalfPriceSupporterPlusForOneYear(stage);
			const discountedPrice =
				(targetCatalogBasePrice * (100 - discountDetails.discountPercentage)) /
				100;
			const isEligible =
				ratePlan.billingPeriod === 'Annual' &&
				previousAmount <= discountedPrice &&
				generallyEligibleForDiscount;
			const maybeDiscount = isEligible
				? { ...discountDetails, discountedPrice }
				: undefined;

			const targetDiscountedBasePrice =
				maybeDiscount?.discountedPrice ?? targetCatalogBasePrice;

			// Validate that the user's desired amount is at least the base Supporter Plus price
			// Only validate when newAmount is explicitly provided by the frontend
			if (
				userRequestedAmount !== undefined &&
				userRequestedAmount < targetDiscountedBasePrice
			) {
				throw new ValidationError(
					`Cannot switch to Supporter Plus: desired amount (${userRequestedAmount}) is less than the minimum Supporter Plus price (${targetDiscountedBasePrice}). Use the members-data-api to modify contribution amounts instead.`,
				);
			}
			const priceWeWillCharge = Math.max(
				userRequestedAmount ?? previousAmount,
				targetDiscountedBasePrice,
			);

			const contributionAmount = priceWeWillCharge - targetDiscountedBasePrice;

			return {
				priceWeWillCharge,
				targetProduct: {
					productRatePlanId: ratePlan.id,
					contributionCharge: {
						id: ratePlan.charges.Contribution.id,
						contributionAmount,
					},
					baseChargeIds: charges.filter((c) => c !== undefined),
				} satisfies CatalogInformation['targetProduct'],
				maybeDiscount,
			};
		})
		.buildProductResult((product, ratePlanResultInner) => ratePlanResultInner)
		.matchProduct('DigitalSubscription')
		.matchRatePlans(['Monthly', 'Annual'])
		.matchCharges({
			Subscription: (c) => c.id,
		})
		.buildRatePlanResult((ratePlan, charges) => {
			const catalogPrice = ratePlan.pricing[currency];
			if ((userRequestedAmount ?? previousAmount) !== catalogPrice)
				throw new ValidationError('this product has no contribution element');
			return {
				priceWeWillCharge: catalogPrice,
				targetProduct: {
					productRatePlanId: ratePlan.id,
					contributionCharge: undefined,
					baseChargeIds: charges.filter((c) => c !== undefined),
				} satisfies CatalogInformation['targetProduct'],
				maybeDiscount: undefined,
			};
		})
		.buildProductResult((product, ratePlanResultInner) => ratePlanResultInner);
}

function isGenerallyEligibleForDiscount(
	subscription: SinglePlanGuardianSubscription,
	mode: 'switch' | 'save',
	account: ZuoraAccount,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
): Lazy<boolean> {
	if (
		subscription.status === 'Active' &&
		mode === 'save' &&
		account.metrics.totalInvoiceBalance === 0
	) {
		return lazyBillingPreview.then((nextInvoiceItems) => {
			const hasUpcomingDiscount = nextInvoiceItems.some(
				(invoiceItem) => invoiceItem.amount < 0,
			);

			return !hasUpcomingDiscount;
		});
	}
	return new Lazy(() => Promise.resolve(false), 'not eligible for discount');
}

export function validTargetForSourceOrThrow<
	T extends string,
	A extends readonly [T, ...T[]],
>(validTargets: A, requested: string): A[number] {
	const isValid = isInList(validTargets);
	if (!isValid(requested)) {
		throw new ValidationError(`not a valid target product: ${requested}`);
	}
	return requested;
}

function getSubscriptionTotalChargeAmount(
	subscription: SinglePlanGuardianSubscription,
) {
	return sumNumbers(
		objectValues(subscription.ratePlan.ratePlanCharges).flatMap(
			(c: RatePlanCharge) => (c.price !== null ? [c.price] : []),
		),
	);
}

const getSwitchInformation = async <P extends ProductKey>(
	stage: Stage,
	input: ProductSwitchGenericRequestBody,
	{ subscription, productCatalogKeys }: GuardianSubscriptionWithKeys,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	const mode: 'switch' | 'save' = !!input.applyDiscountIfAvailable
		? 'save'
		: 'switch';
	if (mode === 'save' && input.newAmount) {
		throw new ValidationError(
			'you cannot currently choose your amount during the save journey',
		);
	}

	const { sourceProduct, sourceZuoraBillingPeriod, validTargetProducts } =
		buildSourceProductMatcher(productCatalog).run(productCatalogKeys);

	const validTargetProductCatalogKeys: AnyGuardianCatalogKeys =
		new GuardianKeysValidator(productCatalog).validateOrThrow(
			validTargetForSourceOrThrow(validTargetProducts, input.targetProduct),
			productCatalogKeys.productRatePlanKey,
		);

	logger.log(`switching from/to`, {
		from: productCatalogKeys,
		to: validTargetProductCatalogKeys,
	});

	const previousAmount = getSubscriptionTotalChargeAmount(subscription);

	const generallyEligibleForDiscount = await isGenerallyEligibleForDiscount(
		subscription,
		mode,
		account,
		lazyBillingPreview,
	).get(); // TODO better to defer until we know the product - but then the whole product matcher system needs to be async

	const currency: IsoCurrency = getCurrency(account.metrics.currency);

	const { targetProduct, maybeDiscount, priceWeWillCharge } =
		buildTargetProductMatcher(
			productCatalog,
			stage,
			currency,
			input.newAmount,
			previousAmount,
			generallyEligibleForDiscount,
		).run(validTargetProductCatalogKeys);

	const subscriptionInformation: SubscriptionInformation = {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: subscription.ratePlan.productName,
		previousRatePlanName: subscription.ratePlan.ratePlanName,
		previousAmount,
		currency,
		billingPeriod: sourceZuoraBillingPeriod,
	};

	const termStartDate = dayjs(subscription.termStartDate).startOf('day');
	const startOfToday = today.startOf('day');
	const startNewTerm = termStartDate.isBefore(startOfToday);

	return {
		startNewTerm,
		actualTotalPrice: priceWeWillCharge,
		account: getAccountInformation(account),
		subscription: subscriptionInformation,
		catalog: {
			targetProduct,
			sourceProduct,
		},
		discount: maybeDiscount,
	} satisfies SwitchInformation;
};
export default getSwitchInformation;
