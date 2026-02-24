import { DataExtensionNames } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import type { ProductRatePlan } from '@modules/product-catalog/productCatalog';
import type { SwitchTargetInformation } from '../prepare/switchCatalogHelper';
import type {
	SwitchActionData,
	TargetInformation,
} from '../prepare/targetInformation';

export const digitalSubscriptionTargetInformation: SwitchTargetInformation<
	'DigitalSubscription',
	'Annual' | 'Monthly'
> = {
	fromUserInformation: (
		productRatePlan: ProductRatePlan<
			'DigitalSubscription',
			'Annual' | 'Monthly'
		>,
		switchActionData: SwitchActionData,
	): Promise<TargetInformation> => {
		if (switchActionData.mode === 'save') {
			throw new ValidationError(
				'you cannot currently get a discount on t2->3 switch',
			);
		}
		if (switchActionData.mode === 'switchWithPriceOverride') {
			throw new ValidationError("digital plus doesn't have a variable amount");
		}

		const catalogPrice = productRatePlan.pricing[switchActionData.currency];
		if (switchActionData.includesContribution) {
			throw new ValidationError('existing amount includes a contribution');
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
	},
};
