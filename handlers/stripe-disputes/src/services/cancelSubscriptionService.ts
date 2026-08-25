import dayjs from 'dayjs';
import {
	DataExtensionNames,
	type EmailMessageWithIdentityUserId,
	sendEmail,
} from '@modules/email/email';
import type { Logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { cancelSubscriptionWithOrder } from '@modules/zuora/orders/cancelSubscription';
import { updateSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

/**
 * Reserve two of the consumer Lambda's five minutes for the Stripe rejection,
 * invoice write-offs and cancellation email after the Zuora Order has finished.
 */
const postOrderWorkBufferInMilliseconds = 120_000;
const minimumOrderDurationInMilliseconds = 10_000;
const maximumOrderDurationInMilliseconds = 180_000;

export const orderDuration = (
	getRemainingTimeInMillis: (() => number) | undefined,
): number => {
	const remainingTimeInMilliseconds =
		getRemainingTimeInMillis?.() ??
		maximumOrderDurationInMilliseconds + postOrderWorkBufferInMilliseconds;
	const availableDuration =
		remainingTimeInMilliseconds - postOrderWorkBufferInMilliseconds;
	if (availableDuration < minimumOrderDurationInMilliseconds) {
		throw new Error(
			'Not enough Lambda time remains to safely submit the Zuora cancellation order',
		);
	}
	return Math.min(availableDuration, maximumOrderDurationInMilliseconds);
};

export interface CancelSubscriptionResult {
	cancelled: boolean;
	negativeInvoiceId?: string;
}

export async function cancelSubscriptionService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	disputeId: string,
	getRemainingTimeInMillis?: () => number,
): Promise<CancelSubscriptionResult> {
	if (subscription.status !== 'Active') {
		logger.log(
			`Subscription already inactive (${subscription.status}), skipping cancellation`,
		);
		return { cancelled: false };
	}

	logger.log(
		`Canceling active subscription: ${subscription.subscriptionNumber}`,
	);

	const today = dayjs();
	const negativeInvoiceId = await cancelSubscriptionWithOrder(
		zuoraClient,
		{
			accountNumber: subscription.accountNumber,
			subscriptionNumber: subscription.subscriptionNumber,
			orderDate: today,
			cancellationEffectiveDate: today,
		},
		orderDuration(getRemainingTimeInMillis),
		`stripe-dispute-cancellation-${disputeId}`,
	);

	if (negativeInvoiceId !== undefined) {
		logger.log(`Cancellation generated negative invoice: ${negativeInvoiceId}`);
	}

	logger.log('Subscription cancellation succeeded');

	// Update subscription with cancellation reason
	try {
		logger.log('Updating subscription with cancellation reason');
		await updateSubscription(zuoraClient, subscription.subscriptionNumber, {
			CancellationReason__c: 'Disputed Payment',
		});
		logger.log('Subscription cancellation reason update succeeded');
	} catch (updateError) {
		logger.error('Failed to update cancellation reason:', updateError);
		// Don't throw - the cancellation succeeded even if the update failed
	}

	// Send cancellation email - non-critical, should not block the flow
	try {
		const account = await getAccount(zuoraClient, subscription.accountNumber);
		const customerEmail = account.billToContact.workEmail;

		if (!customerEmail) {
			logger.error(
				`No email address found for subscription ${subscription.subscriptionNumber}`,
			);
		} else {
			logger.log(
				`Sending dispute cancellation email to customer: ${customerEmail}`,
			);

			const emailMessage: EmailMessageWithIdentityUserId = {
				To: {
					Address: customerEmail,
					ContactAttributes: {
						SubscriberAttributes: {
							EmailAddress: customerEmail,
							SubscriptionNumber: subscription.subscriptionNumber,
							DisputeCreatedDate: dayjs().format('YYYY-MM-DD'),
						},
					},
				},
				DataExtensionName: DataExtensionNames.stripeDisputeCancellation,
				IdentityUserId: account.basicInfo.identityId,
			};

			await sendEmail(stageFromEnvironment(), emailMessage, (message: string) =>
				logger.log(message),
			);

			logger.log('Dispute cancellation email sent successfully');
		}
	} catch (emailError) {
		logger.error('Failed to send dispute cancellation email:', emailError);
	}

	return { cancelled: true, negativeInvoiceId };
}
