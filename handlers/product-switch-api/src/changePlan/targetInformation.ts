import { ValidationError } from '@modules/errors';
import { type IsoCurrency } from '@modules/internationalisation/currency';
import { Lazy } from '@modules/lazy';
import {
	ProductCatalog,
	ProductCatalogHelper,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	annualContribHalfPriceSupporterPlusForOneYear,
	Discount,
} from '../discounts';
import type { ProductSwitchGenericRequestBody } from '../schemas';
import { isInList } from '@modules/arrayFunctions';
import { GuardianCatalogKeys } from './getSinglePlanFlattenedSubscriptionOrThrow';
import { logger } from '@modules/routing/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	getValidTargetProducts,
	ValidTargetProductKey,
} from '../validSwitches';

export type TargetInformation = {
	actualTotalPrice: number; // email, sf tracking
	productRatePlanId: string; // order, supporter product data
	ratePlanName: string; // supporter product data
	subscriptionChargeId: string; // adjust invoice, build response // used to find the price and service end date (next payment date) from the preview invoice, also to find and adjust out any charge less than 0.50
	contributionCharge?: TargetContribution; // order // used to find the price from the preview invoice as above, also to do the chargeOverrides in the order to set the additional amount to take
	discount?: Discount; // order (product rate plan id), return to client
};

export type TargetContribution = {
	id: string;
	contributionAmount: number;
};

class GuardianKeysValidator {
	constructor(private productCatalog: ProductCatalog) {}

	validateOrThrow<P extends ProductKey>(
		targetGuardianProductName: P,
		productRatePlanKey: string,
	): GuardianCatalogKeys<P> {
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
			productRatePlanKey: productRatePlanKey as ProductRatePlanKey<P>,
		} as GuardianCatalogKeys<P>;
	}

	private hasRatePlan<P extends ProductKey>(
		productRatePlanKey: string,
		ratePlans: ProductCatalog[P]['ratePlans'],
	): productRatePlanKey is ProductRatePlanKey<P> {
		return productRatePlanKey in ratePlans;
	}
}

class TargetInformationBuilder {
	constructor(
		private currency: IsoCurrency,
		private previousAmount: number,
		private generallyEligibleForDiscount: boolean,
		private userRequestedAmount: number | undefined,
		private productCatalogHelper: ProductCatalogHelper,
	) {}

	getTargetInformation(
		validTargetProductCatalogKeys: GuardianCatalogKeys<ValidTargetProductKey>,
	) {
		// let testing: TargetInformation;
		switch (validTargetProductCatalogKeys.productKey) {
			case 'SupporterPlus':
				switch (validTargetProductCatalogKeys.productRatePlanKey) {
					case 'Annual':
					case 'Monthly':
						const ratePlan = this.productCatalogHelper.getProductRatePlan(
							validTargetProductCatalogKeys.productKey,
							validTargetProductCatalogKeys.productRatePlanKey,
						);
						return this.getSupporterPlusInformation(
							ratePlan,
							ratePlan.charges.Subscription.id,
						);
					default:
						return undefined;
				}
			case 'DigitalSubscription':
				switch (validTargetProductCatalogKeys.productRatePlanKey) {
					case 'Annual':
					case 'Monthly':
						const ratePlan = this.productCatalogHelper.getProductRatePlan(
							validTargetProductCatalogKeys.productKey,
							validTargetProductCatalogKeys.productRatePlanKey,
						);
						return this.handleDigitalSubscription(
							ratePlan,
							ratePlan.charges.Subscription.id,
						);
					default:
						return undefined;
				}
		}
	}

	getSupporterPlusInformation(
		ratePlan: ProductRatePlan<'SupporterPlus', 'Annual' | 'Monthly'>,
		subscriptionChargeId: string,
	): TargetInformation {
		const targetCatalogBasePrice = ratePlan.pricing[this.currency];
		const discountDetails = annualContribHalfPriceSupporterPlusForOneYear;
		const discountedPrice =
			(targetCatalogBasePrice * (100 - discountDetails.discountPercentage)) /
			100;
		const isEligible =
			ratePlan.billingPeriod === 'Annual' &&
			this.previousAmount <= discountedPrice &&
			this.generallyEligibleForDiscount; // TODO use central eligibility checker pattern
		const discount = isEligible
			? { ...discountDetails, discountedPrice }
			: undefined;

		const targetDiscountedBasePrice =
			discount?.discountedPrice ?? targetCatalogBasePrice;

		// Validate that the user's desired amount is at least the base Supporter Plus price
		// Only validate when newAmount is explicitly provided by the frontend
		if (
			this.userRequestedAmount !== undefined &&
			this.userRequestedAmount < targetDiscountedBasePrice
		) {
			throw new ValidationError(
				`Cannot switch to Supporter Plus: desired amount (${this.userRequestedAmount}) is less than the minimum Supporter Plus price (${targetDiscountedBasePrice}). Use the members-data-api to modify contribution amounts instead.`,
			);
		}
		const actualTotalPrice = Math.max(
			this.userRequestedAmount ?? this.previousAmount,
			targetDiscountedBasePrice,
		);

		const contributionAmount = actualTotalPrice - targetDiscountedBasePrice;

		return {
			actualTotalPrice,
			productRatePlanId: ratePlan.id,
			ratePlanName:
				ratePlan.billingPeriod === 'Month'
					? `Supporter Plus V2 - Monthly`
					: `Supporter Plus V2 - Annual`,
			contributionCharge: {
				id: ratePlan.charges.Contribution.id,
				contributionAmount,
			},
			subscriptionChargeId,
			discount,
		} satisfies TargetInformation;
	}

	handleDigitalSubscription(
		ratePlan: ProductRatePlan<'DigitalSubscription', 'Annual' | 'Monthly'>,
		subscriptionChargeId: string,
	): TargetInformation {
		const catalogPrice = ratePlan.pricing[this.currency];
		if ((this.userRequestedAmount ?? this.previousAmount) !== catalogPrice)
			throw new ValidationError('this product has no contribution element');
		return {
			actualTotalPrice: catalogPrice,
			productRatePlanId: ratePlan.id,
			ratePlanName:
				ratePlan.billingPeriod === 'Month'
					? `Digital Pack Monthly`
					: `Digital Pack Annual`,
			contributionCharge: undefined,
			subscriptionChargeId,
			discount: undefined,
		} satisfies TargetInformation;
	}
}

function validTargetForSourceOrThrow<
	T extends string,
	A extends readonly [T, ...T[]],
>(validTargets: A, requested: string): A[number] {
	const isValid = isInList(validTargets);
	if (!isValid(requested)) {
		throw new ValidationError(`not a valid target product: ${requested}`);
	}
	return requested;
}

const getSwitchInformation = async (
	mode: 'switch' | 'save',
	input: ProductSwitchGenericRequestBody,
	productCatalogKeys: GuardianCatalogKeys<ProductKey>,
	generallyEligibleForDiscount: Lazy<boolean>,
	currency: IsoCurrency,
	previousAmount: number,
	productCatalog: ProductCatalog,
): Promise<TargetInformation> => {
	if (mode === 'save' && input.newAmount) {
		throw new ValidationError(
			'you cannot currently choose your amount during the save journey',
		);
	}

	const validTargetProducts = getIfDefined(
		getValidTargetProducts(productCatalogKeys),
		'switch not available',
	);

	const validTargetProductCatalogKeys: GuardianCatalogKeys<ValidTargetProductKey> =
		new GuardianKeysValidator(productCatalog).validateOrThrow(
			validTargetForSourceOrThrow(validTargetProducts, input.targetProduct),
			productCatalogKeys.productRatePlanKey,
		);

	logger.log(`switching from/to`, {
		from: productCatalogKeys,
		to: validTargetProductCatalogKeys,
	});

	const targetInformationBuilder = new TargetInformationBuilder(
		currency,
		previousAmount,
		await generallyEligibleForDiscount.get(), // ideally defer until we know the product - but then the whole product matcher system needs to be async
		input.newAmount,
		new ProductCatalogHelper(productCatalog),
	);

	return getIfDefined(
		targetInformationBuilder.getTargetInformation(
			validTargetProductCatalogKeys,
		),
		'switch not defined',
	);
};
export default getSwitchInformation;
