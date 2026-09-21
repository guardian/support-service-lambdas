import type { EmailMessageWithUserId } from '@modules/email/email';
import {
	buildEmailMessage,
	DataExtensionNames,
	sendEmail,
} from '@modules/email/email';
import type { Stage } from '@modules/stage';
import { putEmailFailureMetric } from './cloudwatch';

function getUrls(stage: Stage, invitationCode: string) {
	const baseUrl =
		stage === 'PROD'
			? 'https://support.theguardian.com'
			: 'https://support.code.dev-theguardian.com';
	return {
		acceptInvitationUrl: `${baseUrl}/invitation/accept/${invitationCode}`,
		rejectInvitationUrl: `${baseUrl}/invitation/reject/${invitationCode}`,
	};
}

export async function sendInvitationEmail(
	stage: Stage,
	secondaryUserIdentityId: string,
	secondaryUserEmail: string,
	primaryUserFirstName: string,
	primaryUserEmail: string,
	invitationCode: string,
) {
	const urls = getUrls(stage, invitationCode);
	const dataAttributes = {
		primary_user_first_name: primaryUserFirstName,
		primary_user_email: primaryUserEmail,
		accept_invitation_url: urls.acceptInvitationUrl,
		reject_invitation_url: urls.rejectInvitationUrl,
	};

	const emailMessage = buildEmailMessage(
		secondaryUserEmail,
		DataExtensionNames.multipleAccountEmails.secondaryUser.invitation,
		dataAttributes,
		{ IdentityUserId: secondaryUserIdentityId },
	);
	await sendEmailWithErrorHandling(stage, emailMessage, (error: string) =>
		console.log(
			`Failed to trigger invitation email to ${secondaryUserIdentityId} (${secondaryUserEmail}) for invitation ${invitationCode}: ${error}`,
		),
	);
}

export async function sendInvitationRedeemedEmail(
	stage: Stage,
	{
		primaryUserIdentityId,
		primaryUserFirstName,
		primaryUserEmail,
		secondaryUserEmail,
		secondaryUserIdentityId,
	}: {
		primaryUserIdentityId: string;
		primaryUserFirstName: string;
		primaryUserEmail: string;
		secondaryUserEmail: string;
		secondaryUserIdentityId: string;
	},
) {
	const dataAttributes = {
		primary_user_first_name: primaryUserFirstName,
		primary_user_email: primaryUserEmail,
	};

	const secondaryUserEmailMessage = buildEmailMessage(
		secondaryUserEmail,
		DataExtensionNames.multipleAccountEmails.secondaryUser.invitationRedeemed,
		dataAttributes,
		{ IdentityUserId: secondaryUserIdentityId },
	);

	const primaryUserEmailMessage = buildEmailMessage(
		primaryUserEmail,
		DataExtensionNames.multipleAccountEmails.primaryUser.invitationRedeemed,
		{},
		{ IdentityUserId: primaryUserIdentityId },
	);

	await Promise.all([
		sendEmailWithErrorHandling(
			stage,
			secondaryUserEmailMessage,
			(error: string) =>
				console.log(
					`Failed to trigger invitation redeemed email to secondary user ${secondaryUserEmail}: ${error}`,
				),
		),
		sendEmailWithErrorHandling(
			stage,
			primaryUserEmailMessage,
			(error: string) =>
				console.log(
					`Failed to trigger send invitation redeemed email to primary user ${primaryUserIdentityId} (${primaryUserEmail}): ${error}`,
				),
		),
	]);
}

export async function sendAccessRemovedEmail(
	stage: Stage,
	{
		primaryUserFirstName,
		primaryUserEmail,
		secondaryUserEmail,
		secondaryUserIdentityId,
	}: {
		primaryUserFirstName: string;
		primaryUserEmail: string;
		secondaryUserEmail: string;
		secondaryUserIdentityId: string;
	},
) {
	const dataAttributes = {
		primary_user_first_name: primaryUserFirstName,
		primary_user_email: primaryUserEmail,
		secondary_user_email: secondaryUserEmail,
	};

	const emailMessage = buildEmailMessage(
		secondaryUserEmail,
		DataExtensionNames.multipleAccountEmails.secondaryUser.accessRemoved,
		dataAttributes,
		{ IdentityUserId: secondaryUserIdentityId },
	);
	await sendEmailWithErrorHandling(stage, emailMessage, (error: string) =>
		console.log(
			`Failed to trigger access removed email to secondary user ${secondaryUserIdentityId} (${secondaryUserEmail}): ${error}`,
		),
	);
}

export async function sendDeclineInvitationEmail(
	stage: Stage,
	{
		primaryUserIdentityId,
		primaryUserEmail,
	}: {
		primaryUserIdentityId: string;
		primaryUserEmail: string;
	},
) {
	const emailMessage = buildEmailMessage(
		primaryUserEmail,
		DataExtensionNames.multipleAccountEmails.primaryUser.invitationDeclined,
		{},
		{ IdentityUserId: primaryUserIdentityId },
	);
	await sendEmailWithErrorHandling(stage, emailMessage, (error: string) =>
		console.log(
			`Failed to trigger declined invitation email to primary user ${primaryUserIdentityId} (${primaryUserEmail}): ${error}`,
		),
	);
}

export async function sendLeaveSubscriptionEmailToSecondary(
	stage: Stage,
	{
		primaryUserFirstName,
		primaryUserEmail,
		secondaryUserEmail,
		secondaryUserIdentityId,
	}: {
		primaryUserFirstName: string;
		primaryUserEmail: string;
		secondaryUserEmail: string;
		secondaryUserIdentityId: string;
	},
) {
	const dataAttributes = {
		primary_user_first_name: primaryUserFirstName,
		primary_user_email: primaryUserEmail,
		secondary_user_email: secondaryUserEmail,
	};

	const emailMessage = buildEmailMessage(
		secondaryUserEmail,
		DataExtensionNames.multipleAccountEmails.secondaryUser.leaveSubscription,
		dataAttributes,
		{ IdentityUserId: secondaryUserIdentityId },
	);
	await sendEmailWithErrorHandling(stage, emailMessage, (error: string) =>
		console.log(
			`Failed to trigger leave subscription email to secondary user ${secondaryUserIdentityId} (${secondaryUserEmail}): ${error}`,
		),
	);
}

export async function sendLeaveSubscriptionEmailToPrimary(
	stage: Stage,
	{
		primaryUserEmail,
		primaryUserIdentityId,
	}: {
		primaryUserEmail: string;
		primaryUserIdentityId: string;
	},
) {
	const dataAttributes = {};

	const emailMessage = buildEmailMessage(
		primaryUserEmail,
		DataExtensionNames.multipleAccountEmails.primaryUser
			.secondaryUserLeftSubscription,
		dataAttributes,
		{ IdentityUserId: primaryUserIdentityId },
	);
	await sendEmailWithErrorHandling(stage, emailMessage, (error: string) =>
		console.log(
			`Failed to trigger leave subscription email to primary user ${primaryUserIdentityId} (${primaryUserEmail}): ${error}`,
		),
	);
}

async function sendEmailWithErrorHandling(
	stage: Stage,
	emailMessage: EmailMessageWithUserId,
	errorHandler: (message: string) => void,
) {
	try {
		await sendEmail(stage, emailMessage);
	} catch (error: unknown) {
		errorHandler(error instanceof Error ? error.message : 'unknown');
		void putEmailFailureMetric(stage);
	}
}
