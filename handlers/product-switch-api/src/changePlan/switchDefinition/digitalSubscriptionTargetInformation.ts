import { ValidationError } from '@modules/errors';
import type { ProductRatePlan } from '@modules/product-catalog/productCatalog';
import type {
	SwitchActionData,
	TargetInformation,
} from '../prepare/targetInformation';

export function digitalSubscriptionTargetInformation(
	ratePlan: ProductRatePlan<'DigitalSubscription', 'Annual' | 'Monthly'>,
	switchActionData: SwitchActionData,
): Promise<TargetInformation> {
	if (switchActionData.mode === 'save') {
		throw new ValidationError(
			'you cannot currently get a discount on t2->3 switch',
		);
	}
	if (switchActionData.mode === 'switchWithPriceOverride') {
		throw new ValidationError(
			'only base price is possible for the t2->3 switch',
		);
	}

	const catalogPrice = ratePlan.pricing[switchActionData.currency];
	if (switchActionData.previousAmount > catalogPrice)
		{throw new ValidationError('this product has no contribution element');}
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
