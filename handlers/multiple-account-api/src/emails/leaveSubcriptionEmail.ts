import {
	buildEmailMessage,
	DataExtensionNames,
	sendEmail,
} from '@modules/email/email';
import type { Stage } from '@modules/stage';

export async function sendLeaveSubscriptionEmailToSecondary(
	stage: Stage,
	primaryUserFirstName: string,
	primaryUserEmail: string,
	secondaryUserEmail: string,
	secondaryUserIdentityId: string,
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
	await sendEmail(stage, emailMessage);
}

export async function sendLeaveSubscriptionEmailToPrimary(
	stage: Stage,
	primaryUserEmail: string,
	primaryUserIdentityId: string,
) {
	const dataAttributes = {};

	const emailMessage = buildEmailMessage(
		primaryUserEmail,
		DataExtensionNames.multipleAccountEmails.primaryUser
			.secondaryUserLeftSubscription,
		dataAttributes,
		{ IdentityUserId: primaryUserIdentityId },
	);
	await sendEmail(stage, emailMessage);
}
