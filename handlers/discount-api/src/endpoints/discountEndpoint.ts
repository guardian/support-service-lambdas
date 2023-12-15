import dayjs from 'dayjs';
import type { Stage } from '../../../../modules/stage';
import { sum } from '../arrayFunctions';
import { getZuoraCatalog } from '../catalog/catalog';
import { EligibilityChecker } from '../eligibilityChecker';
import { checkDefined } from '../nullAndUndefined';
import type { Discount } from '../productToDiscountMapping';
import { getDiscountFromSubscription } from '../productToDiscountMapping';
import { applyDiscountSchema } from '../requestSchema';
import { addDiscount, previewDiscount } from '../zuora/addDiscount';
import { getBillingPreview } from '../zuora/billingPreview';
import { getSubscription } from '../zuora/getSubscription';
import { ZuoraClient } from '../zuora/zuoraClient';

export const discountEndpoint = async (stage: Stage, body: string | null) => {
	const zuoraClient = await ZuoraClient.create(stage);
	const catalog = await getZuoraCatalog(stage);
	const eligibilityChecker = new EligibilityChecker(catalog);

	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(body, 'No body was provided')),
	);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(
		zuoraClient,
		applyDiscountBody.subscriptionNumber,
	);

	console.log('Getting billing preview for the subscription');
	const billingPreview = await getBillingPreview(
		zuoraClient,
		dayjs().add(13, 'months'),
		subscription.accountNumber,
	);

	console.log('Working out the appropriate discount for the subscription');
	const discount = getDiscountFromSubscription(stage, subscription);

	console.log('Checking this subscription is eligible for the discount');
	const nextBillingDate = eligibilityChecker.getNextBillingDateIfEligible(
		subscription,
		billingPreview,
		discount.productRatePlanId,
	);

	if (applyDiscountBody.preview) {
		console.log('Preview the new price once the discount has been applied');
		return getDiscountPreview(
			zuoraClient,
			applyDiscountBody.subscriptionNumber,
			nextBillingDate,
			discount,
		);
	} else {
		return applyDiscount(
			zuoraClient,
			applyDiscountBody.subscriptionNumber,
			nextBillingDate,
			discount.productRatePlanId,
		);
	}
};

const getDiscountPreview = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	nextBillingDate: Date,
	discount: Discount,
) => {
	const previewResponse = await previewDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(nextBillingDate),
		discount.productRatePlanId,
	);

	if (!previewResponse.success || previewResponse.invoiceItems.length != 2) {
		throw new Error(
			'Unexpected data in preview response from Zuora. ' +
				'We expected 2 invoice items, one for the discount and one for the main plan',
		);
	}

	const discountedPrice = sum(
		previewResponse.invoiceItems,
		(item) => item.chargeAmount + item.taxAmount,
	);

	return {
		body: JSON.stringify({
			discountedPrice,
			upToPeriods: discount.upToPeriods,
			upToPeriodsType: discount.upToPeriodsType,
		}),
		statusCode: 200,
	};
};

const applyDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	nextBillingDate: Date,
	discountProductRatePlanId: string,
) => {
	console.log('Apply a discount to the subscription');
	const discounted = await addDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(nextBillingDate),
		discountProductRatePlanId,
	);

	if (discounted.success) {
		console.log('Discount applied successfully');
	}
	return {
		body: 'Success',
		statusCode: 200,
	};
};
