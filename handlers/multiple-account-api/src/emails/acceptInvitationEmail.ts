import {
	buildEmailMessage,
	DataExtensionNames,
	sendEmail,
} from '@modules/email/email';
import type { Stage } from '@modules/stage';

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
		sendEmail(stage, secondaryUserEmailMessage),
		sendEmail(stage, primaryUserEmailMessage),
	]);
}
