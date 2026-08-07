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
	await sendEmail(stage, emailMessage);
}
