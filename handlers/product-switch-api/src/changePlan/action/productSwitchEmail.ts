import type { EmailMessageWithUserId } from '@modules/email/email';
import { sendEmail } from '@modules/email/email';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import type { Stage } from '@modules/stage';
import dayjs from 'dayjs';
import type { PaymentMethodType } from '../prepare/accountInformation';
import type { SwitchInformation } from '../prepare/switchInformation';

export const buildEmailMessage = (
	firstPaymentAmount: number,
	nextPayment: { date: Date; total: number } | undefined,
	switchInformation: SwitchInformation,
	today: dayjs.Dayjs,
): EmailMessageWithUserId => {
	const {
		emailAddress,
		firstName,
		lastName,
		identityId,
		currency,
		paymentMethodType,
	} = switchInformation.account;
	const { subscriptionNumber, productRatePlanKey } =
		switchInformation.subscription;

	const frequency = (
		{
			Monthly: 'Monthly',
			Annual: 'Annually',
		} as const
	)[productRatePlanKey];

	return {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					currency: getCurrencyInfo(currency).extendedGlyph,
					price: switchInformation.target.ongoingPrice.toFixed(2),
					first_payment_amount: firstPaymentAmount.toFixed(2),
					date_of_first_payment: today.format('DD MMMM YYYY'),
					next_payment_amount:
						nextPayment !== undefined
							? nextPayment.total.toFixed(2)
							: 'unknown amount',
					date_of_next_payment:
						nextPayment !== undefined
							? dayjs(nextPayment.date).format('DD MMMM YYYY')
							: 'unknown date',
					payment_frequency: frequency,
					payment_method: emailPaymentMethodTypes[paymentMethodType],
					subscription_id: subscriptionNumber,
				},
			},
		},
		DataExtensionName: switchInformation.target.dataExtensionName,
		IdentityUserId: identityId,
	};
};

const emailPaymentMethodTypes: Record<PaymentMethodType, string> = {
	BankTransfer: 'Direct Debit',
	CreditCardReferenceTransaction: 'Credit/Debit Card',
	PayPal: 'PayPal',
};

export const sendThankYouEmail = async (
	stage: Stage,
	firstPaymentAmount: number,
	nextPayment: { date: Date; total: number } | undefined,
	switchInformation: SwitchInformation,
) => {
	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		firstPaymentAmount,
		nextPayment,
		switchInformation,
		dayjs(),
	);

	return await sendEmail(stage, emailMessage);
};
