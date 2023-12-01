import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { sum } from './arrayFunctions';
import type { ZuoraCatalog } from './catalog/catalog';
import { getZuoraCatalog } from './catalog/catalog';
import { checkDefined } from './nullAndUndefined';
import { digitalSubSaveRequestSchema } from './requestSchema';
import { getBillingPreview, getNextInvoice } from './zuora/billingPreview';
import { getSubscription } from './zuora/getSubscription';
import type { ZuoraClient } from './zuora/zuoraClient';
import { createZuoraClient } from './zuora/zuoraClient';
import type { RatePlan, ZuoraSubscription } from './zuora/zuoraSchemas';

export const digiSubProductRatePlanIds: {
	[K in Stage]: { monthly: string; annual: string; quarterly: string };
} = {
	CODE: {
		monthly: '2c92c0f84bbfec8b014bc655f4852d9d',
		quarterly: '2c92c0f84bbfec58014bc6a2d43a1f5b',
		annual: '2c92c0f94bbffaaa014bc6a4212e205b',
	},
	PROD: {
		monthly: '2c92a0fb4edd70c8014edeaa4eae220a',
		quarterly: '2c92a0fb4edd70c8014edeaa4e8521fe',
		annual: '2c92a0fb4edd70c8014edeaa4e972204',
	},
};
export const createDigitalSubscriptionSaveDiscount = async (stage: Stage) => {
	const catalog = await getZuoraCatalog(stage);
	const zuoraClient = await createZuoraClient(stage);

	return new DigitalSubscriptionSaveDiscount(stage, catalog, zuoraClient);
};
export class DigitalSubscriptionSaveDiscount {
	constructor(
		private stage: Stage,
		private catalog: ZuoraCatalog,
		private zuoraClient: ZuoraClient,
	) {}
	async applyDiscount(body: string) {
		const requestBody = digitalSubSaveRequestSchema.parse(JSON.parse(body));

		console.log('Getting the subscription details from Zuora');
		const subscription = await getSubscription(
			this.zuoraClient,
			requestBody.subscriptionNumber,
		);
		console.log('Subscription details: ', JSON.stringify(subscription));

		await this.checkEligibility(subscription);
	}

	// digitalSubProductRatePlansFromCatalog = () =>
	// 	this.catalog.products
	// 		.flatMap((product) => product.productRatePlans)
	// 		.filter((productRatePlan) => {
	// 			return Object.values(digiSubProductRatePlanIds[this.stage]).includes(
	// 				productRatePlan.id,
	// 			);
	// 		});

	checkEligibility = async (subscription: ZuoraSubscription) => {
		// Check that the subscription is a digital subscription
		const digitalSubRatePlan: RatePlan = checkDefined(
			this.findLatestDigitalSubRatePlan(subscription),
			'No digital subscription rate plan charge found on subscription',
		);

		// Check that the next payment is at least at the catalog price
		await this.checkNextPaymentIsAtCatalogPrice(
			subscription.accountNumber,
			digitalSubRatePlan,
		);
	};

	findLatestDigitalSubRatePlan = (subscription: ZuoraSubscription) => {
		const idsForStage = Object.values(digiSubProductRatePlanIds[this.stage]);
		return (
			subscription.ratePlans
				// For subscriptions which have been price risen for a future date, the original rate plan
				// will be present but lastChangeType will be 'Removed'
				.filter((ratePlan) => ratePlan.lastChangeType !== 'Removed')
				.find((ratePlan: RatePlan) =>
					idsForStage.includes(ratePlan.productRatePlanId),
				)
		);
	};

	checkNextPaymentIsAtCatalogPrice = async (
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
		const nextInvoice = getNextInvoice(billingPreview);
		const nextInvoiceTotal =
			(nextInvoice?.chargeAmount ?? 0) + (nextInvoice?.taxAmount ?? 0);

		if (nextInvoiceTotal < totalPrice) {
			throw new Error(
				'Next invoice is less than the current catalog price of the ' +
					'subscription, so it is not eligible for a discount',
			);
		}
	};
}
