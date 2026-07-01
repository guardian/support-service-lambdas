import type { EmailMessageWithUserId } from '@modules/email/email';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import type dayjs from 'dayjs';
import type { PaymentMethodType } from '../prepare/accountInformation';
import type { SwitchInformation } from '../prepare/switchInformation';

export const buildEmailMessage = (
	firstPaymentAmount: number,
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

	const [billingPeriodMonths, frequency] = (
		{
			Monthly: [1, 'Monthly'],
			Annual: [12, 'Annually'],
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
					next_payment_amount: switchInformation.target.ongoingPrice.toFixed(2),
					date_of_next_payment: today
						.add(billingPeriodMonths, 'month')
						.format('DD MMMM YYYY'),
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
