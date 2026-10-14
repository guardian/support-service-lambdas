import type { Dayjs } from 'dayjs';
import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { buildEmailMessage, DataExtensionNames } from '@modules/email/email';
import { getUserByIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getIfDefined, isNonEmpty } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type { CancellationEvent } from '@modules/subscription-events/shared/cancellationEvent';
import type {
	OrderNumber,
	SubscriptionNumber,
} from '@modules/zuora/identifiers';
import type { GetOrderResponse } from '@modules/zuora/orders/getOrder';
import { getOrder } from '@modules/zuora/orders/getOrder';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getCancellationEffectiveDate } from './getCancellationEffectiveDate';
import { identityIdSchema } from './identityId';

export type HandleCancellationServices = {
	stage: Stage;
	secondaryUserRepository: SecondaryUserRepository;
	identityClient: IdentityClient;
	zuoraClient: ZuoraClient;
};

export const handleCancellation = async (
	event: CancellationEvent,
	{
		stage,
		secondaryUserRepository,
		identityClient,
		zuoraClient,
	}: HandleCancellationServices,
): Promise<void> => {
	const { subscriptionNumber, orderNumber, allowUserNotifications } =
		event.detail;

	if (!allowUserNotifications) {
		logger.log(
			'allowUserNotifications is false - not sending cancellation emails',
		);
		return;
	}

	const secondaryUsers =
		await secondaryUserRepository.listActiveBySubscription(subscriptionNumber);
	if (!isNonEmpty(secondaryUsers)) {
		logger.log(`No active secondary users, nothing to do`);
		return;
	}

	// gather all information before doing any sends, so it's safe for SQS to retry this message.
	const emailMessages: EmailMessageWithUserId[] = await buildEmails(
		identityClient,
		zuoraClient,
		secondaryUsers,
		orderNumber,
		subscriptionNumber,
	);

	// send emails in a single batch at the end to avoid sending repeat emails on retries
	await sendEmails(stage, emailMessages, subscriptionNumber);
};

async function buildEmails(
	identityClient: IdentityClient,
	zuoraClient: ZuoraClient,
	secondaryUsers: [SecondaryUserRecord, ...SecondaryUserRecord[]],
	orderNumber: OrderNumber,
	subscriptionNumber: SubscriptionNumber,
) {
	// ideally the secondary user repo should parse the identity ids up front for everyone's benefit
	const primaryIdentityId = identityIdSchema.parse(
		secondaryUsers[0].primaryIdentityId,
	);
	const primaryUser = getIfDefined(
		await getUserByIdentityId(identityClient, primaryIdentityId),
		`no user for identity id ${primaryIdentityId}`,
	);
	const primaryUserFirstName = primaryUser.privateFields?.firstName;
	const primaryUserEmail = getIfDefined(
		primaryUser.primaryEmailAddress,
		`No email address found for identity id ${primaryIdentityId}`,
	);

	// the bus has "thin" events so we have to look the date up ourselves from the order number
	const order: GetOrderResponse = await getOrder(zuoraClient, orderNumber);
	const cancellationEffectiveDate: Dayjs = getCancellationEffectiveDate(
		order,
		subscriptionNumber,
	);

	const emailMessages = await Promise.all(
		secondaryUsers.map(async (secondaryUser: SecondaryUserRecord) => {
			return await buildEmail(
				identityClient,
				secondaryUser,
				primaryUserFirstName,
				primaryUserEmail,
				cancellationEffectiveDate,
			);
		}),
	);
	return emailMessages;
}

async function buildEmail(
	identityClient: IdentityClient,
	secondaryUser: SecondaryUserRecord,
	primaryUserFirstName: string | undefined,
	primaryUserEmail: string,
	cancellationEffectiveDate: Dayjs,
): Promise<EmailMessageWithUserId> {
	const secondaryIdentityId = identityIdSchema.parse(
		secondaryUser.secondaryIdentityId,
	);
	const secondaryUserDetails = await getUserByIdentityId(
		identityClient,
		secondaryIdentityId,
	);
	const secondaryUserEmailAddress = getIfDefined(
		secondaryUserDetails?.primaryEmailAddress,
		`No email address found for identity id ${secondaryIdentityId}`,
	);
	const secondaryUserEmailIds =
		DataExtensionNames.multipleAccountEmails.secondaryUser;
	return buildEmailMessage(
		secondaryUserEmailAddress,
		secondaryUserEmailIds.subscriptionCancelled,
		{
			primary_user_first_name: primaryUserFirstName ?? '',
			primary_user_email: primaryUserEmail,
			cancellation_effective_date:
				cancellationEffectiveDate.format('DD MMMM YYYY'),
		},
		{ IdentityUserId: secondaryIdentityId },
	);
}

async function sendEmails(
	stage: Stage,
	emailMessages: EmailMessageWithUserId[],
	subscriptionNumber: SubscriptionNumber,
) {
	const queueName = `braze-emails-${stage}`;
	// we don't expect the number of emails to be too many to send in one go
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
}
