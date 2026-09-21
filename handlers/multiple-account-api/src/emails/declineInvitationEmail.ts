import {
	buildEmailMessage,
	DataExtensionNames,
	sendEmail,
} from '@modules/email/email';
import type { Stage } from '@modules/stage';

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
	await sendEmail(stage, emailMessage);
}
