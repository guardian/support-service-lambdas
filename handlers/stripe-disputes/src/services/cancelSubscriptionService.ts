import {
	DataExtensionNames,
	type EmailMessageWithIdentityUserId,
	sendEmail,
} from '@modules/email/email';
import type { Logger } from '@modules/routing/logger';
import { stageFromEnvironment } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { cancelSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

export async function cancelSubscriptionService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
): Promise<boolean> {
	if (subscription.status !== 'Active') {
		logger.log(
			`Subscription already inactive (${subscription.status}), skipping cancellation`,
		);
		return false;
	}

	logger.log(
		`Canceling active subscription: ${subscription.subscriptionNumber}`,
	);

	const cancelResponse = await cancelSubscription(
		zuoraClient,
		subscription.subscriptionNumber,
		dayjs(),
		false,
		undefined,
		'EndOfLastInvoicePeriod',
	);

	logger.log(
		'Subscription cancellation response:',
		JSON.stringify(cancelResponse),
	);

	// Get account details to retrieve customer email
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const customerEmail = account.billToContact.workEmail;

	if (!customerEmail) {
		logger.error(
			`No email address found for subscription ${subscription.subscriptionNumber}`,
		);
	} else {
		// Send email notification to customer
		logger.log(
			`Sending dispute cancellation email to customer: ${customerEmail}`,
		);

		try {
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
		} catch (emailError) {
			logger.error('Failed to send dispute cancellation email:', emailError);
			// Don't throw - we still want to return true since cancellation succeeded
		}
	}

	return true;
}
