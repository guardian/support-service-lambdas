import type { DataExtensionName } from '@modules/email/email';
import { type IsoCurrency } from '@modules/internationalisation/currency';
import type {
	GuardianCatalogKeys,
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { GuardianRatePlan } from '../../guardianSubscription/reprocessRatePlans/guardianRatePlanBuilder';
import type { ProductSwitchTargetBody, SwitchMode } from '../schemas';
import type { Discount } from '../switchDefinition/discounts';
import type {
	AvailableTargetProducts,
	ValidTargetProduct,
} from './switchCatalogHelper';
import {
	getAvailableTargetProducts,
	getSwitchTargetInformation,
} from './switchCatalogHelper';

export type TargetInformation = {
	actualTotalPrice: number; // email, sf tracking
	productRatePlanId: string; // order, supporter product data
	ratePlanName: string; // supporter product data
	dataExtensionName: DataExtensionName; // email
	subscriptionChargeId: string; // adjust invoice, build response // used to find the price and service end date (next payment date) from the preview invoice, also to find and adjust out any charge less than 0.50
	contributionCharge?: TargetContribution; // order // used to find the price from the preview invoice as above, also to do the chargeOverrides in the order to set the additional amount to take
	discount?: Discount; // order (product rate plan id), return to client
};

export type TargetContribution = {
	id: string;
	contributionAmount: number;
};

/**
 * this holds input or existing subscription information needed in order to add the new product
 */
export type SwitchActionData = {
	mode: SwitchMode;
	currency: IsoCurrency;
	isGuardianEmail: boolean;
} & (
	| {
			mode: 'switchToBasePrice' | 'save';
			previousAmount: number;
			includesContribution: boolean;
	  }
	| {
			mode: 'switchWithPriceOverride';
			userRequestedAmount: number;
	  }
);

/**
 * validate that the requested switch is possible and allowed for the situation, returning any information needed to
 * add the new subscription correctly (or report the preview as appropriate)
 */
export const getTargetInformation = (
	input: ProductSwitchTargetBody,
	productCatalogKeys: GuardianRatePlan,
	currency: IsoCurrency,
	previousAmount: number,
	includesContribution: boolean,
	isGuardianEmail: boolean,
	productCatalogHelper: ProductCatalogHelper,
): Promise<TargetInformation> => {
	const targetProductKeys: GuardianCatalogKeys<typeof input.targetProduct> =
		productCatalogHelper.validateOrThrow(
			input.targetProduct,
			productCatalogKeys.productRatePlanKey, // keep the rate plan name (frequency) as the existing sub
		);

	let switchActionData: SwitchActionData;
	switch (input.mode) {
		case 'switchToBasePrice':
		case 'save':
			switchActionData = {
				mode: input.mode,
				currency,
				previousAmount,
				includesContribution,
				isGuardianEmail,
			};
			break;
		case 'switchWithPriceOverride':
			switchActionData = {
				mode: input.mode,
				currency,
				userRequestedAmount: input.newAmount,
				isGuardianEmail,
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
	SP extends ProductKey,
	TP extends ValidTargetProduct,
>(
	productCatalogHelper: ProductCatalogHelper,
	sourceProductKeys: GuardianCatalogKeys<SP>,
	targetProductKeys: GuardianCatalogKeys<TP>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	const validSwitches: AvailableTargetProducts = getAvailableTargetProducts(
		sourceProductKeys.productKey,
		sourceProductKeys.productRatePlanKey,
	);

	const targetInformation = getSwitchTargetInformation(
		validSwitches,
		targetProductKeys.productKey,
		targetProductKeys.productRatePlanKey,
		`${sourceProductKeys.productKey} ${sourceProductKeys.productRatePlanKey}`,
	);

	const targetProductRatePlan = productCatalogHelper.getProductRatePlan(
		targetProductKeys.productKey,
		targetProductKeys.productRatePlanKey,
	);

	return targetInformation.fromUserInformation(
		targetProductRatePlan,
		switchActionData,
	);
}
