import {
	DataExtensionNames,
	type EmailMessageWithIdentityUserId,
	sendEmail,
} from '@modules/email/email';
import type { Logger } from '@modules/routing/logger';
import { stageFromEnvironment } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import {
	cancelSubscription,
	updateSubscription,
} from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

export interface CancelSubscriptionResult {
	cancelled: boolean;
	negativeInvoiceId?: string;
}

export async function cancelSubscriptionService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
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

	const cancelResponse = await cancelSubscription(
		zuoraClient,
		subscription.subscriptionNumber,
		dayjs(),
		true,
	);

	const negativeInvoiceId = cancelResponse.invoiceId;
	if (negativeInvoiceId) {
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
