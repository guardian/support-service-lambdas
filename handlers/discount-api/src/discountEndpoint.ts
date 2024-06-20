import { sum } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { addDiscount, previewDiscount } from '@modules/zuora/addDiscount';
import {
	billingPreviewToSimpleInvoiceItems,
	getBillingPreview,
	getNextInvoiceItems,
	getNextNonFreePaymentDate,
} from '@modules/zuora/billingPreview';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/zuoraSchemas';
import { getZuoraCatalog } from '@modules/zuora-catalog/S3';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import dayjs from 'dayjs';
import { EligibilityChecker } from './eligibilityChecker';
import { generateCancellationDiscountConfirmationEmail } from './generateCancellationDiscountConfirmationEmail';
import { getDiscountFromSubscription } from './productToDiscountMapping';

export const previewDiscountEndpoint = async (
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	subscriptionNumber: string,
	today: dayjs.Dayjs,
) => {
	const zuoraClient = await ZuoraClient.create(stage);

	const { subscription, account } = await getSubscriptionIfBelongsToIdentityId(
		headers,
		zuoraClient,
		subscriptionNumber,
	);

	const { discount, dateToApply } = await getDiscountToApply(
		stage,
		subscription,
		account,
		zuoraClient,
		today,
	);

	console.log('Preview the new price once the discount has been applied');
	const previewResponse = await previewDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(dateToApply),
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

	const firstDiscountedPaymentDate = zuoraDateFormat(dayjs(dateToApply));
	if (discount.upToPeriodsType !== 'Months') {
		throw new Error(
			'only discounts measured in months are supported in this version of discount-api',
		);
	}
	const nextNonDiscountedPaymentDate = zuoraDateFormat(
		dayjs(dateToApply).add(discount.upToPeriods, 'month'),
	);

	return {
		discountedPrice,
		upToPeriods: discount.upToPeriods,
		upToPeriodsType: discount.upToPeriodsType,
		firstDiscountedPaymentDate,
		nextNonDiscountedPaymentDate,
	};
};

export const applyDiscountEndpoint = async (
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	subscriptionNumber: string,
	today: dayjs.Dayjs,
) => {
	const zuoraClient = await ZuoraClient.create(stage);

	const { subscription, account } = await getSubscriptionIfBelongsToIdentityId(
		headers,
		zuoraClient,
		subscriptionNumber,
	);

	const { discount, dateToApply } = await getDiscountToApply(
		stage,
		subscription,
		account,
		zuoraClient,
		today,
	);
	console.log('Apply a discount to the subscription');
	const discounted = await addDiscount(
		zuoraClient,
		subscriptionNumber,
		dayjs(subscription.termStartDate),
		dayjs(subscription.termEndDate),
		dayjs(dateToApply),
		discount.productRatePlanId,
	);

	if (!discounted.success) {
		throw new Error('discount was not applied: ' + JSON.stringify(discounted));
	}

	console.log('Discount applied successfully');

	const billingPreviewAfter = await getBillingPreview(
		zuoraClient,
		dayjs().add(13, 'months'), // 13 months gives us minimum 2 payments even on an Annual sub
		subscription.accountNumber,
	);

	const nextPaymentDate = getNextNonFreePaymentDate(
		billingPreviewToSimpleInvoiceItems(billingPreviewAfter),
	);

	const emailPayload = discount.sendEmail
		? generateCancellationDiscountConfirmationEmail({
				firstDiscountedPaymentDate: dayjs(dateToApply),
				nextNonDiscountedPaymentDate: dayjs(nextPaymentDate),
				emailAddress: account.billToContact.workEmail,
				firstName: account.billToContact.firstName,
				lastName: account.billToContact.lastName,
				identityId: account.basicInfo.identityId,
			})
		: undefined;

	return {
		emailPayload,
		response: {
			nextNonDiscountedPaymentDate: zuoraDateFormat(dayjs(nextPaymentDate)),
		},
	};
};

async function getSubscriptionIfBelongsToIdentityId(
	headers: APIGatewayProxyEventHeaders,
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
) {
	const identityId = getIfDefined(
		headers['x-identity-id'],
		'Identity ID not found in request',
	);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);

	console.log('get account for the subscription');
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	console.log('assert that sub is owned by logged in user');
	if (account.basicInfo.identityId !== identityId) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityId}`,
		);
	}

	return { subscription, account };
}

async function getDiscountToApply(
	stage: Stage,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	zuoraClient: ZuoraClient,
	today: dayjs.Dayjs,
) {
	const catalog = () => getZuoraCatalog(stage);
	const eligibilityChecker = new EligibilityChecker(
		subscription.subscriptionNumber,
	);

	console.log('get billing preview for the subscription');
	const billingPreview = billingPreviewToSimpleInvoiceItems(
		await getBillingPreview(
			zuoraClient,
			today.add(13, 'months'),
			subscription.accountNumber,
		),
	);

	console.log('Working out the appropriate discount for the subscription');
	const { discount, discountableProductRatePlanId } =
		getDiscountFromSubscription(stage, subscription);

	console.log('Checking this subscription is eligible for the discount');
	switch (discount.eligibilityCheckForRatePlan) {
		case 'EligibleForFreePeriod':
			eligibilityChecker.assertEligibleForFreePeriod(
				discount.productRatePlanId,
				subscription,
				today,
			);
			break;
		case 'AtCatalogPrice':
			eligibilityChecker.assertNextPaymentIsAtCatalogPrice(
				await catalog(),
				billingPreview,
				discountableProductRatePlanId,
				account.metrics.currency,
			);
			break;
	}

	const { date: dateToApply, items: nextInvoiceItems } =
		getNextInvoiceItems(billingPreview);

	eligibilityChecker.assertGenerallyEligible(
		subscription,
		account.metrics.totalInvoiceBalance,
		nextInvoiceItems,
	);
	return { discount, dateToApply };
}
