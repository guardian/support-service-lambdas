import {
	buildEmailMessage,
	DataExtensionNames,
	sendEmail,
} from 'email/src/email';
import type { Stage } from '@modules/stage';

function getUrls(stage: Stage, invitationCode: string) {
	const baseUrl =
		stage === 'PROD'
			? 'https://support.theguardian.com'
			: 'https://support.code.dev-theguardian.com';
	// TODO: get the actual urls for these
	return {
		acceptInvitationUrl: `${baseUrl}/multiple-accounts/accept-invitation?code=${invitationCode}`,
		rejectInvitationUrl: `${baseUrl}/multiple-accounts/reject-invitation?code=${invitationCode}`,
	};
}

export async function sendInvitationEmail(
	stage: Stage,
	identityId: string,
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
		{ IdentityUserId: identityId },
	);
	await sendEmail(stage, emailMessage);
}
