import { ValidationError } from '@modules/errors';
import type { ProductRatePlan } from '@modules/product-catalog/productCatalog';
import type {
	SwitchActionData,
	TargetInformation,
} from '../prepare/targetInformation';
import type { Discount } from './discounts';
import { annualContribHalfPriceSupporterPlusForOneYear } from './discounts';

export async function supporterPlusTargetInformation(
	ratePlan: ProductRatePlan<'SupporterPlus', 'Annual' | 'Monthly'>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	const targetCatalogBasePrice = ratePlan.pricing[switchActionData.currency];

	// Validate that the user's desired amount is at least the base Supporter Plus price
	// Only validate when newAmount is explicitly provided by the frontend
	if (
		switchActionData.mode === 'switchWithPriceOverride' &&
		switchActionData.userRequestedAmount < targetCatalogBasePrice
	) {
		throw new ValidationError(
			`Cannot switch to Supporter Plus: desired amount (${switchActionData.userRequestedAmount}) is less than the minimum Supporter Plus price (${targetCatalogBasePrice}). Use the members-data-api to modify contribution amounts instead.`,
		);
	}

	let discount: Discount | undefined;
	let contributionAmount: number;
	let actualTotalPrice: number;
	if (switchActionData.mode === 'save') {
		const discountDetails = annualContribHalfPriceSupporterPlusForOneYear;
		const discountedPrice =
			(targetCatalogBasePrice * (100 - discountDetails.discountPercentage)) /
			100;

		const isEligible =
			ratePlan.billingPeriod === 'Annual' &&
			switchActionData.previousAmount <= discountedPrice &&
			(await switchActionData.generallyEligibleForDiscount.get()); // TODO use central eligibility checker pattern
		if (isEligible) {
			discount = discountDetails;
			contributionAmount = 0;
			actualTotalPrice = discountedPrice;
		} else {
			throw new ValidationError(
				`Cannot switch to Supporter Plus: not eligible for a save discount`,
			);
		}
	} else {
		actualTotalPrice =
			switchActionData.mode === 'switchWithPriceOverride'
				? switchActionData.userRequestedAmount
				: Math.max(switchActionData.previousAmount, targetCatalogBasePrice);

		contributionAmount = actualTotalPrice - targetCatalogBasePrice;
	}

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
		subscriptionChargeId: ratePlan.charges.Subscription.id,
		discount,
	} satisfies TargetInformation;
}
