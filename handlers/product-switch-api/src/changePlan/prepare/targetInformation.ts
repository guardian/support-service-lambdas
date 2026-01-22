import { ValidationError } from '@modules/errors';
import { type IsoCurrency } from '@modules/internationalisation/currency';
import { Lazy } from '@modules/lazy';
import {
	GuardianCatalogKeys,
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { Discount } from '../../discounts';
import { ProductSwitchTargetBody } from '../../schemas';
import {
	getAvailableSwitchesFrom,
	getSwitchTo,
	ValidSwitchesFromRatePlan,
	ValidTargetProduct,
} from './switchesHelper';

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

export type SwitchActionData = {
	currency: IsoCurrency;
	previousAmount: number;
	generallyEligibleForDiscount: Lazy<boolean>;
	userRequestedAmount: number | undefined;
};

/**
 * validate that the requested switch is possible and allowed for the situation, returning any information needed to
 * add the new subscription correctly.
 */
export const getTargetInformation = (
	mode: 'switch' | 'save',
	input: ProductSwitchTargetBody,
	productCatalogKeys: GuardianCatalogKeys<ProductKey>,
	generallyEligibleForDiscount: Lazy<boolean>,
	currency: IsoCurrency,
	previousAmount: number,
	productCatalogHelper: ProductCatalogHelper,
): Promise<TargetInformation> => {
	if (mode === 'save' && input.newAmount) {
		throw new ValidationError(
			'you cannot currently choose your amount during the save journey',
		);
	}

	const targetProductKeys: GuardianCatalogKeys<typeof input.targetProduct> =
		productCatalogHelper.validateOrThrow(
			input.targetProduct,
			productCatalogKeys.productRatePlanKey, // keep the rate plan name (frequency) as the existing sub
		);

	const switchActionData: SwitchActionData = {
		currency,
		previousAmount,
		generallyEligibleForDiscount,
		userRequestedAmount: input.newAmount,
	};

	return getSwitchSpecificTargetInformationOrThrow(
		productCatalogHelper,
		productCatalogKeys,
		targetProductKeys,
		switchActionData,
	);
};

export function getSwitchSpecificTargetInformationOrThrow<
	SP extends ProductKey, // change to ValidSwitchFromKeys to simplify types?
	TP extends ValidTargetProduct,
>(
	productCatalogHelper: ProductCatalogHelper,
	sourceProductKeys: GuardianCatalogKeys<SP>,
	targetProductKeys: GuardianCatalogKeys<TP>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	const validSwitches: ValidSwitchesFromRatePlan = getAvailableSwitchesFrom(
		sourceProductKeys.productKey,
		sourceProductKeys.productRatePlanKey,
	);

	const buildTargetInformation = getSwitchTo(
		validSwitches,
		targetProductKeys.productKey,
		targetProductKeys.productRatePlanKey,
	);

	return buildTargetInformation(
		productCatalogHelper.getProductRatePlan(
			targetProductKeys.productKey,
			targetProductKeys.productRatePlanKey,
		),
		switchActionData,
	);
}
