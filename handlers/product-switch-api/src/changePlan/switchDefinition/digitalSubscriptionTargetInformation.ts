import { DataExtensionNames } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import type { ProductRatePlan } from '@modules/product-catalog/productCatalog';
import type {
	SwitchActionData,
	TargetInformation,
} from '../prepare/targetInformation';

export function digitalSubscriptionTargetInformation(
	productRatePlan: ProductRatePlan<'DigitalSubscription', 'Annual' | 'Monthly'>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	// to remove once this goes live
	if (!switchActionData.isGuardianEmail) {
		throw new ValidationError('this switch is only available internally');
	}
	if (switchActionData.mode === 'save') {
		throw new ValidationError(
			'you cannot currently get a discount on t2->3 switch',
		);
	}
	if (switchActionData.mode === 'switchWithPriceOverride') {
		throw new ValidationError("digital plus doesn't have a variable amount");
	}

	const catalogPrice = productRatePlan.pricing[switchActionData.currency];
	if (switchActionData.previousAmount > catalogPrice) {
		throw new ValidationError(
			'existing amount is above the base digital plus price',
		);
	}
	const ratePlanName =
		productRatePlan.billingPeriod === 'Month'
			? `Digital Pack Monthly`
			: `Digital Pack Annual`;

	return Promise.resolve({
		actualTotalPrice: catalogPrice,
		productRatePlanId: productRatePlan.id,
		ratePlanName,
		contributionCharge: undefined,
		subscriptionChargeId: productRatePlan.charges.Subscription.id,
		discount: undefined,
		dataExtensionName: DataExtensionNames.supporterPlusToDigitalPlusSwitch,
	} satisfies TargetInformation);
}
