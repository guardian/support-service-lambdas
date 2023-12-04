import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { sum } from './arrayFunctions';
import type { ZuoraCatalog } from './catalog/catalog';
import { getZuoraCatalog } from './catalog/catalog';
import { checkDefined } from './nullAndUndefined';
import { ProductToDiscountMapping } from './productToDiscountMapping';
import { getBillingPreview, getNextInvoice } from './zuora/billingPreview';
import type { ZuoraClient } from './zuora/zuoraClient';
import { createZuoraClient } from './zuora/zuoraClient';
import type { RatePlan, ZuoraSubscription } from './zuora/zuoraSchemas';

export class EligibilityChecker {
	static create = async (stage: Stage) => {
		const catalog = await getZuoraCatalog(stage);
		const zuoraClient = await createZuoraClient(stage);
		return new EligibilityChecker(stage, catalog, zuoraClient);
	};
	constructor(
		private stage: Stage,
		private catalog: ZuoraCatalog,
		private zuoraClient: ZuoraClient,
	) {}

	getNextBillingDateIfEligible = async (
		subscription: ZuoraSubscription,
		discountProductRatePlanId: string,
	) => {
		// Check that subscription is eligible for the discount
		const eligibleRatePlan = this.getEligibleRatePlanFromSubscription(
			subscription,
			discountProductRatePlanId,
		);

		// Check that the next payment is at least at the catalog price
		return await this.checkNextPaymentIsAtCatalogPrice(
			subscription.accountNumber,
			eligibleRatePlan,
		);
	};

	private getEligibleRatePlanFromSubscription = (
		subscription: ZuoraSubscription,
		discountProductRatePlanId: string,
	): RatePlan => {
		const eligibleProductRatePlans = ProductToDiscountMapping[this.stage].find(
			(discount) =>
				discount.discountProductRatePlanId === discountProductRatePlanId,
		)?.eligibleProductRatePlanIds;

		const eligibleRatePlans: RatePlan[] = subscription.ratePlans.filter(
			(ratePlan) =>
				eligibleProductRatePlans?.includes(ratePlan.productRatePlanId),
		);

		if (eligibleRatePlans.length > 1) {
			throw new Error(
				`Subscription ${subscription.subscriptionNumber} has more than one eligible rate plan
				 for ${discountProductRatePlanId}. I don't know whether this should be allowed so fail for now`,
			);
		}

		if (eligibleRatePlans.length === 0 || !eligibleRatePlans[0]) {
			throw new Error(
				`Subscription ${subscription.subscriptionNumber} is not eligible for discount ${discountProductRatePlanId}`,
			);
		}

		return eligibleRatePlans[0];
	};

	private checkNextPaymentIsAtCatalogPrice = async (
		accountNumber: string,
		ratePlan: RatePlan,
	) => {
		// Work out the catalog price of the rate plan
		const currency = checkDefined(
			ratePlan.ratePlanCharges[0]?.currency,
			'No currency found on rate plan charge',
		);
		const prices = this.catalog.getCatalogPriceForCurrency(
			ratePlan.productRatePlanId,
			currency,
		);
		const totalPrice = sum(prices, (i) => i);

		// Work out how much the cost of the next invoice will be
		const billingPreview = await getBillingPreview(
			this.zuoraClient,
			dayjs().add(13, 'months'),
			accountNumber,
		);
		const nextInvoice = checkDefined(
			getNextInvoice(billingPreview),
			`No next invoice found for account ${accountNumber}`,
		);
		const nextInvoiceTotal = nextInvoice.chargeAmount + nextInvoice.taxAmount;

		if (nextInvoiceTotal < totalPrice) {
			throw new Error(
				'Next invoice is less than the current catalog price of the ' +
					'subscription, so it is not eligible for a discount',
			);
		}
		return nextInvoice.serviceStartDate;
	};
}
