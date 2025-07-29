import { sum } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import {
	getBillingPreview,
	getNextInvoice,
	getNextInvoiceItems,
	getNextNonFreePaymentDate,
	getOrderedInvoiceTotals,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import { addDiscount, previewDiscount } from '@modules/zuora/discount';
import type { Logger } from '@modules/logger';
import { isNotRemovedOrDiscount } from '@modules/zuora/rateplan';
import { getSubscription } from '@modules/zuora/subscription';
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
import { zuoraDateFormat } from '../../../modules/zuora/src/utils/common';

export const previewDiscountEndpoint = async (
	logger: Logger,
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	subscriptionNumber: string,
	today: dayjs.Dayjs,
) => {
	const zuoraClient = await ZuoraClient.create(stage, logger);

	const { subscription, account } = await getSubscriptionIfBelongsToIdentityId(
		logger.log.bind(logger),
		headers,
		zuoraClient,
		subscriptionNumber,
	);

	const { discount, dateToApply, orderedInvoiceTotals } =
		await getDiscountToApply(
			logger,
			stage,
			subscription,
			account,
			zuoraClient,
			today,
		);

	logger.log('Preview the new price once the discount has been applied');
	// note that this only returns the next payment - payments are not guaranteed to be identical
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

	const nonDiscountedPayments = orderedInvoiceTotals
		.map(({ date, total }) => ({
			date: zuoraDateFormat(dayjs(date)),
			amount: total,
		}))
		.slice(0, discount.upToPeriods);

	return {
		discountedPrice,
		upToPeriods: discount.upToPeriods,
		upToPeriodsType: discount.upToPeriodsType,
		discountPercentage: discount.discountPercentage,
		firstDiscountedPaymentDate,
		nextNonDiscountedPaymentDate,
		nonDiscountedPayments,
	};
};

export const applyDiscountEndpoint = async (
	logger: Logger,
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	subscriptionNumber: string,
	today: dayjs.Dayjs,
) => {
	const zuoraClient = await ZuoraClient.create(stage, logger);

	const { subscription, account } = await getSubscriptionIfBelongsToIdentityId(
		logger.log.bind(logger),
		headers,
		zuoraClient,
		subscriptionNumber,
	);

	logger.mutableAddContext(
		subscription.ratePlans
			.filter(isNotRemovedOrDiscount)
			.map((p) => p.ratePlanName)
			.join(','),
	);

	const { discount, dateToApply } = await getDiscountToApply(
		logger,
		stage,
		subscription,
		account,
		zuoraClient,
		today,
	);
	logger.log('Apply a discount to the subscription');
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

	logger.log('Discount applied successfully');

	const billingPreviewAfter = await getBillingPreview(
		zuoraClient,
		dayjs().add(13, 'months'), // 13 months gives us minimum 2 payments even on an Annual sub
		subscription.accountNumber,
	);

	const nextPaymentDate = getNextNonFreePaymentDate(
		toSimpleInvoiceItems(
			itemsForSubscription(subscriptionNumber)(billingPreviewAfter),
		),
	);

	const emailPayload = generateCancellationDiscountConfirmationEmail(
		{
			firstDiscountedPaymentDate: dayjs(dateToApply),
			nextNonDiscountedPaymentDate: discount.name.includes('Free')
				? dayjs(nextPaymentDate)
				: dayjs(dateToApply).add(discount.upToPeriods, 'month'),
			emailAddress: account.billToContact.workEmail,
			firstName: account.billToContact.firstName,
			lastName: account.billToContact.lastName,
			identityId: account.basicInfo.identityId,
		},
		discount.emailIdentifier,
	);

	return {
		emailPayload,
		response: {
			nextNonDiscountedPaymentDate: zuoraDateFormat(dayjs(nextPaymentDate)),
		},
	};
};

async function getSubscriptionIfBelongsToIdentityId(
	log: (message: string) => void,
	headers: APIGatewayProxyEventHeaders,
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
) {
	const identityId = getIfDefined(
		headers['x-identity-id'],
		'Identity ID not found in request',
	);

	log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);

	log('get account for the subscription');
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	log('assert that sub is owned by logged in user');
	if (account.basicInfo.identityId !== identityId) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityId}`,
		);
	}

	return { subscription, account };
}

async function getDiscountToApply(
	logger: Logger,
	stage: Stage,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	zuoraClient: ZuoraClient,
	today: dayjs.Dayjs,
) {
	const catalog = () => getZuoraCatalog(stage);
	const eligibilityChecker = new EligibilityChecker(logger);

	// don't get the billing preview until we know the subscription is not cancelled
	const lazyBillingPreview = new Lazy(
		() =>
			getBillingPreview(
				zuoraClient,
				today.add(13, 'months'),
				subscription.accountNumber,
			),
		'get billing preview for the subscription',
	)
		.then(itemsForSubscription(subscription.subscriptionNumber))
		.then(toSimpleInvoiceItems);

	await eligibilityChecker.assertGenerallyEligible(
		subscription,
		account.metrics.totalInvoiceBalance,
		() => lazyBillingPreview.then(getNextInvoiceItems).get(),
	);

	// now we know the subscription is not cancelled we can force the billing preview
	const billingPreview = await lazyBillingPreview.get();

	logger.log('Working out the appropriate discount for the subscription');
	const { discount, discountableProductRatePlanId } =
		getDiscountFromSubscription(stage, subscription);

	logger.log('Checking this subscription is eligible for the discount');
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
		case 'NoRepeats':
			eligibilityChecker.assertNoRepeats(
				discount.productRatePlanId,
				subscription,
			);
			break;
		case 'NoCheck':
			break;
	}

	const dateToApply = getNextInvoice(billingPreview).date;

	const orderedInvoiceTotals = getOrderedInvoiceTotals(billingPreview);

	return { discount, dateToApply, orderedInvoiceTotals };
}
