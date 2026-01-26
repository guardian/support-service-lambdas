import { type IsoCurrency } from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import type {
	GuardianCatalogKeys,
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { ProductSwitchTargetBody } from '../schemas';
import type { Discount } from '../switchDefinition/discounts';
import type {
	ValidSwitchesFromRatePlan,
	ValidTargetProduct} from './switchesHelper';
import {
	getAvailableSwitchesFrom,
	getSwitchTo
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

export type SwitchMode =
	| 'switchToBasePrice'
	| 'switchWithPriceOverride'
	| 'save';
export type SwitchActionData = {
	mode: SwitchMode;
	currency: IsoCurrency;
} & (
	| {
			mode: 'switchToBasePrice';
			previousAmount: number;
	  }
	| {
			mode: 'switchWithPriceOverride';
			userRequestedAmount: number;
	  }
	| {
			mode: 'save';
			previousAmount: number;
			generallyEligibleForDiscount: Lazy<boolean>;
	  }
);

/**
 * validate that the requested switch is possible and allowed for the situation, returning any information needed to
 * add the new subscription correctly.
 */
export const getTargetInformation = (
	mode: SwitchMode,
	input: ProductSwitchTargetBody,
	productCatalogKeys: GuardianCatalogKeys<ProductKey>,
	generallyEligibleForDiscount: Lazy<boolean>,
	currency: IsoCurrency,
	previousAmount: number,
	productCatalogHelper: ProductCatalogHelper,
): Promise<TargetInformation> => {
	const targetProductKeys: GuardianCatalogKeys<typeof input.targetProduct> =
		productCatalogHelper.validateOrThrow(
			input.targetProduct,
			productCatalogKeys.productRatePlanKey, // keep the rate plan name (frequency) as the existing sub
		);

	let switchActionData: SwitchActionData;
	switch (mode) {
		case 'switchToBasePrice':
			switchActionData = {
				mode,
				currency,
				previousAmount,
			};
			break;
		case 'switchWithPriceOverride':
			switchActionData = {
				mode,
				currency,
				userRequestedAmount: getIfDefined(
					input.newAmount,
					'type error - missing amount',
				),
			};
			break;
		case 'save':
			switchActionData = {
				mode,
				currency,
				previousAmount,
				generallyEligibleForDiscount,
			};
			break;
	}

	return getSwitchSpecificTargetInformationOrThrow(
		productCatalogHelper,
		productCatalogKeys,
		targetProductKeys,
		switchActionData,
	);
};

function getSwitchSpecificTargetInformationOrThrow<
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
