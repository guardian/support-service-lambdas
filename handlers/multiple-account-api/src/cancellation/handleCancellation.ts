import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { buildEmailMessage, DataExtensionNames } from '@modules/email/email';
import { getUserByIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getIfDefined, isNonEmpty } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type { CancellationEvent } from '@modules/subscription-events/shared/cancellationEvent';
import type { GetOrderResponse } from '@modules/zuora/orders/getOrder';
import { getOrder } from '@modules/zuora/orders/getOrder';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getCancellationEffectiveDate } from './getCancellationEffectiveDate';

export type HandleCancellationServices = {
	stage: Stage;
	secondaryUserRepository: SecondaryUserRepository;
	// zuoraClient is built asynchronously on cold start (reading secrets), so is
	// held as a promise and awaited once at the top of the handler - same
	// pattern as `handlers/identity-deletion-cleanup`. identityClient is built
	// synchronously from already-loaded config, so needs no such wrapping.
	identityClient: IdentityClient;
	zuoraClient: Promise<ZuoraClient>;
};

export const handleCancellation = async (
	event: CancellationEvent,
	services: HandleCancellationServices,
): Promise<void> => {
	const { subscriptionNumber, orderNumber, allowUserNotifications } =
		event.detail;

	if (!allowUserNotifications) {
		logger.log(
			`Not sending cancellation emails for subscription ${subscriptionNumber}, as allowUserNotifications is false`,
		);
		return;
	}

	const secondaryUsers =
		await services.secondaryUserRepository.listActiveBySubscription(
			subscriptionNumber,
		);
	if (!isNonEmpty(secondaryUsers)) {
		logger.log(
			`No active secondary users found for subscription ${subscriptionNumber}, nothing to do`,
		);
		return;
	}

	// Gather phase: no side effects. If anything here throws, nothing has
	// been sent yet, so it's safe for SQS to retry this message.

	const identityClient: IdentityClient = services.identityClient;
	const zuoraClient: ZuoraClient = await services.zuoraClient;

	const primaryIdentityId = secondaryUsers[0].primaryIdentityId;
	const primaryUser = getIfDefined(
		await getUserByIdentityId(identityClient, primaryIdentityId),
		`no user for identity id ${primaryIdentityId}`,
	);
	const primaryUserFirstName = getIfDefined(
		primaryUser.privateFields?.firstName,
		`No first name found for identity id ${primaryIdentityId}`,
	);
	const primaryUserEmail = getIfDefined(
		primaryUser.primaryEmailAddress,
		`No email address found for identity id ${primaryIdentityId}`,
	);

	const order: GetOrderResponse = await getOrder(zuoraClient, orderNumber);
	const cancellationEffectiveDate = getCancellationEffectiveDate(
		order,
		subscriptionNumber,
	);

	const emailMessages = await Promise.all(
		secondaryUsers.map(async (secondaryUser: SecondaryUserRecord) => {
			const secondaryUserDetails = await getUserByIdentityId(
				identityClient,
				secondaryUser.secondaryIdentityId,
			);
			const secondaryUserEmail = getIfDefined(
				secondaryUserDetails?.primaryEmailAddress,
				`No email address found for identity id ${secondaryUser.secondaryIdentityId}`,
			);
			return buildEmailMessage(
				secondaryUserEmail,
				DataExtensionNames.multipleAccountEmails.secondaryUser
					.subscriptionCancelled,
				{
					primary_user_first_name: primaryUserFirstName,
					primary_user_email: primaryUserEmail,
					cancellation_effective_date:
						cancellationEffectiveDate.format('DD MMMM YYYY'),
				},
				{ IdentityUserId: secondaryUser.secondaryIdentityId },
			);
		}),
	);

	// Send phase: the only side-effecting step. Ideally these will either all
	// fail or the whole lambda will succeed, minimising the risk of sending
	// duplicate emails.

	const queueName = `braze-emails-${services.stage}`;
	const response = await sendBatchMessagesToQueue({
		queueName,
		messages: emailMessages.map((message, index) => ({
			id: `${subscriptionNumber}-${index}`,
			body: JSON.stringify(message),
		})),
	});

	if (response.Failed && response.Failed.length > 0) {
		throw new Error(
			`Failed to send ${response.Failed.length} of ${emailMessages.length} cancellation emails to ${queueName} for subscription ${subscriptionNumber}: ${JSON.stringify(response.Failed)}`,
		);
	}
};
