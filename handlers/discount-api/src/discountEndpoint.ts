import { sum } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import { checkDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { addDiscount, previewDiscount } from '@modules/zuora/addDiscount';
import {
	billingPreviewToRecords,
	getBillingPreview,
	getNextNonFreePaymentDate,
} from '@modules/zuora/billingPreview';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import { getZuoraCatalog } from '@modules/zuora-catalog/S3';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import type { ManipulateType } from 'dayjs';
import dayjs from 'dayjs';
import { EligibilityChecker } from './eligibilityChecker';
import type { Discount } from './productToDiscountMapping';
import { getDiscountFromSubscription } from './productToDiscountMapping';
import { applyDiscountSchema } from './requestSchema';
import type {
	ApplyDiscountResponseBody,
	EligibilityCheckResponseBody,
} from './responseSchema';

export const discountEndpoint = async (
	stage: Stage,
	preview: boolean,
	headers: APIGatewayProxyEventHeaders,
	body: string | null,
): Promise<EligibilityCheckResponseBody | ApplyDiscountResponseBody> => {
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
	const { discount, nonDiscountRatePlan } = getDiscountFromSubscription(
		stage,
		subscription,
	);

	console.log('Checking this subscription is eligible for the discount');
	const dateToApply = eligibilityChecker.getNextBillingDateIfEligible(
		billingPreview,
		nonDiscountRatePlan,
	);

	if (preview) {
		console.log('Preview the new price once the discount has been applied');
		return getDiscountPreview(
			zuoraClient,
			requestBody.subscriptionNumber,
			dateToApply,
			discount,
		);
	} else {
		return applyDiscount(
			zuoraClient,
			requestBody.subscriptionNumber,
			subscription.termStartDate,
			subscription.termEndDate,
			dateToApply,
			discount.productRatePlanId,
			subscription.accountNumber,
		);
	}
};

const getDiscountPreview = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	nextBillingDate: Date,
	discount: Discount,
): Promise<EligibilityCheckResponseBody> => {
	const previewResponse = await previewDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(nextBillingDate),
		discount.productRatePlanId,
	);

	if (!previewResponse.success || previewResponse.invoiceItems.length < 2) {
		throw new Error(
			'Unexpected data in preview response from Zuora. ' +
				'We expected at least 2 invoice items, one for the discount and at least one for the main plan',
		);
	}

	const discountedPrice = sum(
		previewResponse.invoiceItems,
		(item) => item.chargeAmount + item.taxAmount,
	);

	const firstDiscountedPaymentDate = zuoraDateFormat(dayjs(nextBillingDate));
	if (discount.upToPeriodsType !== 'Months') {
		throw new Error(
			'only discounts measured in months are supported in this version of discount-api',
		);
	}
	const unit: ManipulateType = 'month';
	const nextNonDiscountedPaymentDate = zuoraDateFormat(
		dayjs(nextBillingDate).add(discount.upToPeriods, unit),
	);

	return {
		discountedPrice,
		upToPeriods: discount.upToPeriods,
		upToPeriodsType: discount.upToPeriodsType,
		firstDiscountedPaymentDate,
		nextNonDiscountedPaymentDate,
	};
};

const applyDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	termStartDate: Date,
	termEndDate: Date,
	nextBillingDate: Date,
	discountProductRatePlanId: string,
	accountNumber: string,
): Promise<ApplyDiscountResponseBody> => {
	console.log('Apply a discount to the subscription');
	const discounted = await addDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(termStartDate),
		dayjs(termEndDate),
		dayjs(nextBillingDate),
		discountProductRatePlanId,
	);

	if (discounted.success) {
		console.log('Discount applied successfully');
	} else {
		throw new Error('discount was not applied: ' + JSON.stringify(discounted));
	}

	const billingPreviewAfter = await getBillingPreview(
		zuoraClient,
		dayjs().add(13, 'months'),
		accountNumber,
	);

	const nextPaymentDate = getNextNonFreePaymentDate(
		billingPreviewToRecords(billingPreviewAfter),
	);

	return { nextPaymentDate };
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
