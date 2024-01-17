import { sum } from '@modules/arrayFunctions';
import { getZuoraCatalog } from '@modules/catalog/catalog';
import { checkDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { addDiscount, previewDiscount } from '@modules/zuora/addDiscount';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import dayjs from 'dayjs';
import { EligibilityChecker } from './eligibilityChecker';
import { ValidationError } from './errors';
import type { Discount } from './productToDiscountMapping';
import { getDiscountFromSubscription } from './productToDiscountMapping';
import { applyDiscountSchema } from './requestSchema';

export const discountEndpoint = async (
	stage: Stage,
	preview: boolean,
	headers: APIGatewayProxyEventHeaders,
	body: string | null,
) => {
	const zuoraClient = await ZuoraClient.create(stage);
	const catalog = await getZuoraCatalog(stage);
	const eligibilityChecker = new EligibilityChecker(catalog);

	const identityId = checkDefined(
		headers['x-identity-id'],
		'Identity ID not found in request',
	);

	const requestBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(body, 'No body was provided')),
	);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(
		zuoraClient,
		requestBody.subscriptionNumber,
	);

	if (subscription.status !== 'Active') {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} has status ${subscription.status}`,
		);
	}

	console.log(
		'Check sub is owned by user & get billing preview for the subscription',
	);
	const [, billingPreview] = await Promise.all([
		checkSubscriptionBelongsToIdentityId(zuoraClient, subscription, identityId),
		getBillingPreview(
			zuoraClient,
			dayjs().add(13, 'months'),
			subscription.accountNumber,
		),
	]);

	console.log('Working out the appropriate discount for the subscription');
	const discount = getDiscountFromSubscription(stage, subscription);

	console.log('Checking this subscription is eligible for the discount');
	const nextBillingDate = eligibilityChecker.getNextBillingDateIfEligible(
		subscription,
		billingPreview,
		discount.productRatePlanId,
	);

	if (preview) {
		console.log('Preview the new price once the discount has been applied');
		return getDiscountPreview(
			zuoraClient,
			requestBody.subscriptionNumber,
			nextBillingDate,
			discount,
		);
	} else {
		return applyDiscount(
			zuoraClient,
			requestBody.subscriptionNumber,
			subscription.termStartDate,
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
	termStartDate: Date,
	nextBillingDate: Date,
	discountProductRatePlanId: string,
) => {
	console.log('Apply a discount to the subscription');
	const discounted = await addDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(termStartDate),
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
const checkSubscriptionBelongsToIdentityId = async (
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	identityId: string,
) => {
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	if (account.basicInfo.identityId !== identityId) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityId}`,
		);
	}
};
