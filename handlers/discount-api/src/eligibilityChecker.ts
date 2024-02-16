import { sum } from '@modules/arrayFunctions';
import type { ZuoraCatalog } from '@modules/catalog/catalog';
import { checkDefined } from '@modules/nullAndUndefined';
import { getNextInvoiceItems } from '@modules/zuora/billingPreview';
import { isNotRemoved } from '@modules/zuora/rateplan';
import type {
	BillingPreview,
	RatePlan,
	ZuoraSubscription,
} from '@modules/zuora/zuoraSchemas';
import { ValidationError } from './errors';
import { getEligibleProductRatePlanIdsForDiscount } from './productToDiscountMapping';

export class EligibilityChecker {
	constructor(private catalog: ZuoraCatalog) {}

	getNextBillingDateIfEligible = (
		subscription: ZuoraSubscription,
		billingPreview: BillingPreview,
		discountProductRatePlanId: string,
	) => {
		const eligibleRatePlan = this.getEligibleRatePlanFromSubscription(
			subscription,
			discountProductRatePlanId,
		);

		console.log(
			'Checking that the next payment is at least at the catalog price',
		);
		const nextBillingDate = this.checkNextPaymentIsAtCatalogPrice(
			billingPreview,
			eligibleRatePlan,
		);

		console.log('Subscription is eligible for the discount');
		return nextBillingDate;
	};

	private getEligibleRatePlanFromSubscription = (
		subscription: ZuoraSubscription,
		discountProductRatePlanId: string,
	): RatePlan => {
		const eligibleProductRatePlans = getEligibleProductRatePlanIdsForDiscount(
			discountProductRatePlanId,
		);

		const eligibleRatePlans: RatePlan[] = subscription.ratePlans.filter(
			(ratePlan) =>
				isNotRemoved(ratePlan) &&
				eligibleProductRatePlans.includes(ratePlan.productRatePlanId),
		);

		if (eligibleRatePlans.length > 1) {
			throw new Error(
				`Subscription ${subscription.subscriptionNumber} has more than one eligible rate plan
				 for ${discountProductRatePlanId}. I don't know whether this should be allowed so fail for now`,
			);
		}

		if (eligibleRatePlans.length === 0 || !eligibleRatePlans[0]) {
			throw new ValidationError(
				`Subscription ${subscription.subscriptionNumber} is not eligible for discount 
				${discountProductRatePlanId} as it does not contain any eligible rate plans`,
			);
		}

		return eligibleRatePlans[0];
	};

	private checkNextPaymentIsAtCatalogPrice = (
		billingPreview: BillingPreview,
		ratePlan: RatePlan,
	) => {
		// Work out the catalog price of the rate plan
		const currency = checkDefined(
			ratePlan.ratePlanCharges[0]?.currency,
			'No currency found on rate plan charge',
		);
		const totalPrice = this.catalog.getCatalogPrice(
			ratePlan.productRatePlanId,
			currency,
		);

		// Work out how much the cost of the next invoice will be
		const nextInvoiceItems = checkDefined(
			getNextInvoiceItems(billingPreview),
			`No next invoice found for account ${billingPreview.accountId}`,
		);
		const nextInvoiceTotal = sum(
			nextInvoiceItems,
			(item) => item.chargeAmount + item.taxAmount,
		);

		if (nextInvoiceTotal < totalPrice) {
			throw new ValidationError(
				`Amount payable for next invoice (${nextInvoiceTotal} ${currency}) is less than the current 
				catalog price of the subscription (${totalPrice} ${currency}), so it is not eligible for a discount`,
			);
		}
		return checkDefined(
			nextInvoiceItems[0]?.serviceStartDate,
			'No next invoice date found in next invoice items',
		);
	};
}
