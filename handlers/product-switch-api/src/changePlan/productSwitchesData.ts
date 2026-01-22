import {
	SwitchActionData,
	TargetInformation,
} from './prepare/targetInformation';
import { ValidSwitches } from './prepare/switchesHelper';
import { ProductRatePlan } from '@modules/product-catalog/productCatalog';
import { ValidationError } from '@modules/errors';
import { annualContribHalfPriceSupporterPlusForOneYear } from '../discounts';

export const productSwitchesData = {
	Contribution: {
		Annual: {
			SupporterPlus: {
				Annual: getSupporterPlusTargetInformation,
			},
		},
		Monthly: {
			SupporterPlus: {
				Annual: getSupporterPlusTargetInformation,
			},
		},
	},
	SupporterPlus: {
		Annual: {
			DigitalSubscription: {
				Annual: digitalSubscriptionTargetInformation,
			},
		},
		Monthly: {
			DigitalSubscription: {
				Monthly: digitalSubscriptionTargetInformation,
			},
		},
	},
} as const satisfies ValidSwitches;

async function getSupporterPlusTargetInformation(
	ratePlan: ProductRatePlan<'SupporterPlus', 'Annual' | 'Monthly'>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	const targetCatalogBasePrice = ratePlan.pricing[switchActionData.currency];
	const discountDetails = annualContribHalfPriceSupporterPlusForOneYear;
	const discountedPrice =
		(targetCatalogBasePrice * (100 - discountDetails.discountPercentage)) / 100;
	const isEligible =
		ratePlan.billingPeriod === 'Annual' &&
		switchActionData.previousAmount <= discountedPrice &&
		(await switchActionData.generallyEligibleForDiscount.get()); // TODO use central eligibility checker pattern
	const discount = isEligible
		? { ...discountDetails, discountedPrice }
		: undefined;

	const targetDiscountedBasePrice =
		discount?.discountedPrice ?? targetCatalogBasePrice;

	// Validate that the user's desired amount is at least the base Supporter Plus price
	// Only validate when newAmount is explicitly provided by the frontend
	if (
		switchActionData.userRequestedAmount !== undefined &&
		switchActionData.userRequestedAmount < targetDiscountedBasePrice
	) {
		throw new ValidationError(
			`Cannot switch to Supporter Plus: desired amount (${switchActionData.userRequestedAmount}) is less than the minimum Supporter Plus price (${targetDiscountedBasePrice}). Use the members-data-api to modify contribution amounts instead.`,
		);
	}
	const actualTotalPrice = Math.max(
		switchActionData.userRequestedAmount ?? switchActionData.previousAmount,
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
		subscriptionChargeId: ratePlan.charges.Subscription.id,
		discount,
	} satisfies TargetInformation;
}

function digitalSubscriptionTargetInformation(
	ratePlan: ProductRatePlan<'DigitalSubscription', 'Annual' | 'Monthly'>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	const catalogPrice = ratePlan.pricing[switchActionData.currency];
	if (
		(switchActionData.userRequestedAmount ??
			switchActionData.previousAmount) !== catalogPrice
	)
		throw new ValidationError('this product has no contribution element');
	return Promise.resolve({
		actualTotalPrice: catalogPrice,
		productRatePlanId: ratePlan.id,
		ratePlanName:
			ratePlan.billingPeriod === 'Month'
				? `Digital Pack Monthly`
				: `Digital Pack Annual`,
		contributionCharge: undefined,
		subscriptionChargeId: ratePlan.charges.Subscription.id,
		discount: undefined,
	} satisfies TargetInformation);
}
