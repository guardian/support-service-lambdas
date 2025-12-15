import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import type { Stage } from '@modules/stage';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import type dayjs from 'dayjs';

/**
 * Build the email message for frequency switch confirmation.
 * This email is sent when a user switches from Monthly to Annual billing.
 *
 * @param emailAddress The recipient's email address
 * @param firstName The recipient's first name
 * @param lastName The recipient's last name
 * @param identityId The user's identity ID
 * @param subscriptionNumber The subscription number
 * @param currency The currency of the subscription
 * @param newAnnualPrice The new annual price
 * @param nextPaymentDate The date of the next payment
 * @returns Email message object
 */
export const buildFrequencySwitchEmailMessage = (
	emailAddress: string,
	firstName: string,
	lastName: string,
	identityId: string,
	subscriptionNumber: string,
	currency: IsoCurrency,
	newAnnualPrice: number,
	nextPaymentDate: dayjs.Dayjs,
): EmailMessageWithUserId => {
	return {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					currency: getCurrencyInfo(currency).extendedGlyph,
					new_price: newAnnualPrice.toFixed(2),
					next_payment_date: nextPaymentDate.format('DD MMMM YYYY'),
					payment_frequency: 'Annually',
					subscription_id: subscriptionNumber,
				},
			},
		},
		DataExtensionName:
			DataExtensionNames.supporterPlusFrequencySwitchConfirmation,
		IdentityUserId: identityId,
	};
};

/**
 * Send a confirmation email after a successful frequency switch.
 * The email confirms the switch from Monthly to Annual billing and provides
 * details about the new payment schedule.
 *
 * @param stage The environment stage (CODE/PROD)
 * @param subscription The Zuora subscription
 * @param account The Zuora account
 * @param newAnnualPrice The new annual price
 * @param effectiveDate The date when the switch takes effect (next payment date)
 * @returns Promise that resolves when the email is sent
 */
export const sendFrequencySwitchConfirmationEmail = async (
	stage: Stage,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	currency: IsoCurrency,
	newAnnualPrice: number,
	effectiveDate: dayjs.Dayjs,
): Promise<void> => {
	const emailAddress = account.billToContact.workEmail;
	const firstName = account.billToContact.firstName;
	const lastName = account.billToContact.lastName;
	const identityId = account.basicInfo.identityId;
	const subscriptionNumber = subscription.subscriptionNumber;

	const emailMessage = buildFrequencySwitchEmailMessage(
		emailAddress,
		firstName,
		lastName,
		identityId,
		subscriptionNumber,
		currency,
		newAnnualPrice,
		effectiveDate,
	);

	await sendEmail(stage, emailMessage);
};
