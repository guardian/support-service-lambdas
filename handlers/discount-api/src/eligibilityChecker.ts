import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { sum } from './arrayFunctions';
import type { ZuoraCatalog } from './catalog/catalog';
import { getZuoraCatalog } from './catalog/catalog';
import { ValidationError } from './errors';
import { checkDefined } from './nullAndUndefined';
import { ProductToDiscountMapping } from './productToDiscountMapping';
import { getBillingPreview, getNextInvoiceItems } from './zuora/billingPreview';
import { getSubscription } from './zuora/getSubscription';
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
		subscriptionNumber: string,
		discountProductRatePlanId: string,
	) => {
		console.log('Getting the subscription details from Zuora');
		const subscription = await getSubscription(
			this.zuoraClient,
			subscriptionNumber,
		);

		console.log('Checking this subscription is eligible for the discount');

		if (subscription.status !== 'Active') {
			throw new ValidationError(
				`Subscription ${subscription.subscriptionNumber} has status ${subscription.status}`,
			);
		}
		const eligibleRatePlan = this.getEligibleRatePlanFromSubscription(
			subscription,
			discountProductRatePlanId,
		);

		console.log(
			'Checking that the next payment is at least at the catalog price',
		);
		const nextBillingDate = await this.checkNextPaymentIsAtCatalogPrice(
			subscription.accountNumber,
			eligibleRatePlan,
		);

		console.log('Subscription is eligible for the discount');
		return nextBillingDate;
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
			throw new ValidationError(
				`Subscription ${subscription.subscriptionNumber} is not eligible for discount 
				${discountProductRatePlanId} as it does not contain any eligible rate plans`,
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
		const chargePrices = this.catalog.getCatalogPriceOfCharges(
			ratePlan.productRatePlanId,
			currency,
		);
		const totalPrice = sum(chargePrices, (i) => i);

		// Work out how much the cost of the next invoice will be
		const billingPreview = await getBillingPreview(
			this.zuoraClient,
			dayjs().add(13, 'months'),
			accountNumber,
		);
		const nextInvoiceItems = checkDefined(
			getNextInvoiceItems(billingPreview),
			`No next invoice found for account ${accountNumber}`,
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
