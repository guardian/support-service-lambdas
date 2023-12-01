import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import {
	getCatalogFromS3,
	getCatalogPriceForCurrency,
	getDiscountProductRatePlans,
} from './catalog';
import type { Catalog, ProductRatePlan } from './catalogSchema';
import { checkDefined } from './nullAndUndefined';
import { digitalSubSaveRequestSchema } from './requestSchema';
import { getBillingPreview } from './zuora/billingPreview';
import { getSubscription } from './zuora/getSubscription';
import type { ZuoraClient } from './zuora/zuoraClient';
import { createZuoraClient } from './zuora/zuoraClient';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from './zuora/zuoraSchemas';

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
	const catalog = await getCatalogFromS3(stage);
	const catalogProductRatePlans: ProductRatePlan[] = catalog.products
		.flatMap((product) => product.productRatePlans)
		.filter((productRatePlan) => {
			return Object.values(digiSubProductRatePlanIds[stage]).includes(
				productRatePlan.id,
			);
		});
	return new DigitalSubscriptionSaveDiscount(stage, catalog);
};
export class DigitalSubscriptionSaveDiscount {
	constructor(
		private stage: Stage,
		private catalog: Catalog,
	) {}
	async applyDiscount(body: string) {
		const requestBody = digitalSubSaveRequestSchema.parse(JSON.parse(body));
		const zuoraClient = await createZuoraClient(this.stage);

		console.log('Getting the subscription details from Zuora');
		const subscription = await getSubscription(
			zuoraClient,
			requestBody.subscriptionNumber,
		);
		console.log('Subscription details: ', JSON.stringify(subscription));

		this.checkEligibility(subscription, zuoraClient);
	}

	digitalSubProductRatePlansFromCatalog = () =>
		this.catalog.products
			.flatMap((product) => product.productRatePlans)
			.filter((productRatePlan) => {
				return Object.values(digiSubProductRatePlanIds[this.stage]).includes(
					productRatePlan.id,
				);
			});

	checkEligibility = (
		subscription: ZuoraSubscription,
		zuoraClient: ZuoraClient,
	) => {
		// Check that the subscription is a digital subscription
		const digitalSubRatePlan: RatePlan = checkDefined(
			this.findLatestDigitalSubRatePlan(subscription),
			'No digital subscription rate plan charge found on subscription',
		);

		// Check that the subscription is not already discounted
		this.checkSubscriptionIsNotAlreadyDiscounted(
			digitalSubRatePlan,
			subscription,
			zuoraClient,
		);

		// Check that the subscription is or will be on the new price
		this.checkSubscriptionIsOrWillBeOnNewPrice(digitalSubRatePlan);
	};

	checkSubscriptionIsNotAlreadyDiscounted = (
		subscriptionRatePlan: RatePlan,
		subscription: ZuoraSubscription,
		zuoraClient: ZuoraClient,
	) => {
		const currency = checkDefined(
			subscriptionRatePlan.ratePlanCharges[0]?.currency,
			'Currency was missing from rate plan charge',
		);
		const catalogPrice = getCatalogPriceForCurrency(
			this.catalog,
			subscriptionRatePlan.productRatePlanId,
			currency,
		);
		const billingPreview = await getBillingPreview(
			zuoraClient,
			dayjs().add(13, 'month'),
			subscription.accountNumber,
		);
	};

	checkSubscriptionIsOrWillBeOnNewPrice = (
		digitalSubRatePlanCharge: RatePlanCharge,
	) => {
		const currency = digitalSubRatePlanCharge.currency;
		const catalogRatePlan = checkDefined(
			this.digitalSubProductRatePlansFromCatalog().find(
				(productRatePlan) =>
					productRatePlan.id === digitalSubRatePlanCharge.productRatePlanId,
			),
			`No matching rate plan found in catalog for product rate plan 
			id ${digitalSubRatePlanCharge.productRatePlanId}`,
		);
		const catalogPrice = checkDefined(
			catalogRatePlan.productRatePlanCharges[0]?.pricing.find(
				(pricing) => pricing.currency === currency,
			)?.price,
			`No matching price found in catalog for currency ${currency}`,
		);
		const currentPrice = checkDefined(
			digitalSubRatePlanCharge.price,
			'Price was null on existing rate plan charge',
		);
		if (currentPrice < catalogPrice) {
			throw new Error(
				`Subscription is ineligible because the current price is less than the new price: 
				current price is ${currency}${currentPrice} and new price is ${currency}${catalogPrice}`,
			);
		}
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
}
