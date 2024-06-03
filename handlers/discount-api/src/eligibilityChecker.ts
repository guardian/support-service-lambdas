import {sum} from '@modules/arrayFunctions';
import {ValidationError} from '@modules/errors';
import {checkDefined} from '@modules/nullAndUndefined';
import {getNextInvoiceItems} from '@modules/zuora/billingPreview';
import type {BillingPreview, RatePlan,} from '@modules/zuora/zuoraSchemas';
import type {ZuoraCatalogHelper} from '@modules/zuora-catalog/zuoraCatalog';

export class EligibilityChecker {
	constructor(private catalog: ZuoraCatalogHelper) {}

	getNextBillingDateIfEligible = (
		billingPreview: BillingPreview,
		ratePlan: RatePlan,
	) => {
		console.log(
			'Checking that the next payment is at least at the catalog price',
		);
		const nextBillingDate = this.checkNextPaymentIsAtCatalogPrice(
			billingPreview,
			ratePlan,
		);

		console.log('Subscription is eligible for the discount');
		return nextBillingDate;
	};

	private checkNextPaymentIsAtCatalogPrice = (
		billingPreview: BillingPreview,
		ratePlan: RatePlan,
	) => {
		// Work out the catalog price of the rate plan
		const currency = checkDefined(
			ratePlan.ratePlanCharges[0]?.currency,
			'No charges found on rate plan',
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
