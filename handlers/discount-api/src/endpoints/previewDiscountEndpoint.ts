import dayjs from 'dayjs';
import type { Stage } from '../../../../modules/stage';
import { sum } from '../arrayFunctions';
import { getZuoraCatalog } from '../catalog/catalog';
import { EligibilityChecker } from '../eligibilityChecker';
import { ValidationError } from '../errors';
import { checkDefined } from '../nullAndUndefined';
import { getDiscountProductRatePlanIdFromSubscription } from '../productToDiscountMapping';
import { applyDiscountSchema } from '../requestSchema';
import { previewDiscount } from '../zuora/addDiscount';
import { getBillingPreview } from '../zuora/billingPreview';
import { getSubscription } from '../zuora/getSubscription';
import { ZuoraClient } from '../zuora/zuoraClient';

const previewDiscountResponse = (
	eligible: boolean,
	discountedPrice?: number,
) => {
	return {
		body: JSON.stringify({
			valid: eligible,
			discountedPrice,
		}),
		statusCode: 200,
	};
};

export const previewDiscountEndpoint = async (
	stage: Stage,
	body: string | null,
) => {
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
	const discountProductRatePlanId =
		getDiscountProductRatePlanIdFromSubscription(stage, subscription);

	try {
		const nextBillingDate = eligibilityChecker.getNextBillingDateIfEligible(
			subscription,
			billingPreview,
			discountProductRatePlanId,
		);
		const discountedPrice = await getDiscountPricePreview(
			zuoraClient,
			applyDiscountBody.subscriptionNumber,
			nextBillingDate,
			discountProductRatePlanId,
		);
		return previewDiscountResponse(true, discountedPrice);
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
			return previewDiscountResponse(false);
		} else {
			throw error;
		}
	}
};

const getDiscountPricePreview = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	nextBillingDate: Date,
	discountProductRatePlanId: string,
) => {
	console.log('Preview the new price once the discount has been applied');
	const previewResponse = await previewDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(nextBillingDate),
		discountProductRatePlanId,
	);

	if (!previewResponse.success || previewResponse.invoiceItems.length != 2) {
		throw new Error(
			'Unexpected data in preview response from Zuora. ' +
				'We expected 2 invoice items, one for the discount and one for the main plan',
		);
	}

	return sum(
		previewResponse.invoiceItems,
		(item) => item.chargeAmount + item.taxAmount,
	);
};
