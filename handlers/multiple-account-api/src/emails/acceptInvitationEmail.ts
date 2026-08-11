import {
	buildEmailMessage,
	DataExtensionNames,
	sendEmail,
} from '@modules/email/email';
import type { Stage } from '@modules/stage';

export async function sendAcceptInvitationEmail(
	stage: Stage,
	primaryUserFirstName: string,
	primaryUserEmail: string,
	secondaryUserEmail: string,
	secondaryUserIdentityId: string,
) {
	const dataAttributes = {
		primary_user_first_name: primaryUserFirstName,
		primary_user_email: primaryUserEmail,
	};

	const emailMessage = buildEmailMessage(
		secondaryUserEmail,
		DataExtensionNames.multipleAccountEmails.secondaryUser.invitationRedeemed,
		dataAttributes,
		{ IdentityUserId: secondaryUserIdentityId },
	);
	await sendEmail(stage, emailMessage);
}
