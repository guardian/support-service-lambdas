import dayjs from 'dayjs';
import type { Stage } from '../../../../modules/stage';
import { getZuoraCatalog } from '../catalog/catalog';
import { EligibilityChecker } from '../eligibilityChecker';
import { checkDefined } from '../nullAndUndefined';
import { getDiscountProductRatePlanIdFromSubscription } from '../productToDiscountMapping';
import { applyDiscountSchema } from '../requestSchema';
import { addDiscount } from '../zuora/addDiscount';
import { getBillingPreview } from '../zuora/billingPreview';
import { getSubscription } from '../zuora/getSubscription';
import { ZuoraClient } from '../zuora/zuoraClient';

export const applyDiscountEndpoint = async (
	stage: Stage,
	body: string | null,
) => {
	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(body, 'No body was provided')),
	);

	const zuoraClient = await ZuoraClient.create(stage);
	const catalog = await getZuoraCatalog(stage);
	const eligibilityChecker = new EligibilityChecker(catalog);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(
		zuoraClient,
		applyDiscountBody.subscriptionNumber,
	);
	console.log('Getting the billing preview for the subscription');
	const billingPreview = await getBillingPreview(
		zuoraClient,
		dayjs().add(13, 'months'),
		subscription.accountNumber,
	);
	console.log('Working out the appropriate discount for the subscription');
	const discountProductRatePlanId =
		getDiscountProductRatePlanIdFromSubscription(stage, subscription);

	const nextBillingDate = eligibilityChecker.getNextBillingDateIfEligible(
		subscription,
		billingPreview,
		discountProductRatePlanId,
	);

	console.log('Apply a discount to the subscription');
	const discounted = await addDiscount(
		zuoraClient,
		subscription.subscriptionNumber,
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
