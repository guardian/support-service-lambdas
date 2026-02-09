import type {
	DataExtensionName,
	EmailMessageWithUserId,
} from '@modules/email/email';
import { sendEmail } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import type { Stage } from '@modules/stage';
import dayjs from 'dayjs';
import type { PaymentMethodType } from '../prepare/accountInformation';
import type { SwitchInformation } from '../prepare/switchInformation';

type Payment = { date: dayjs.Dayjs; amount: number };

export const buildEmailMessage = (
	dataExtensionName: DataExtensionName,
	payments: { first: Payment; next: Payment },
	emailAddress: string,
	firstName: string,
	lastName: string,
	currency: IsoCurrency,
	productPrice: number,
	frequency: string,
	paymentMethodType: PaymentMethodType,
	subscriptionNumber: string,
	identityId: string,
): EmailMessageWithUserId => {
	const { first, next } = payments;
	return {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					currency: getCurrencyInfo(currency).extendedGlyph,
					price: productPrice.toFixed(2),
					first_payment_amount: first.amount.toFixed(2),
					date_of_first_payment: first.date.format('DD MMMM YYYY'),
					next_payment_amount: next.amount.toFixed(2),
					date_of_next_payment: next.date.format('DD MMMM YYYY'),
					payment_frequency: frequency,
					payment_method: emailPaymentMethodTypes[paymentMethodType],
					subscription_id: subscriptionNumber,
				},
			},
		},
		DataExtensionName: dataExtensionName,
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
	switchInformation: SwitchInformation,
) => {
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

	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		switchInformation.target.dataExtensionName,
		{
			first: {
				date: dayjs(),
				amount: firstPaymentAmount,
			},
			next: {
				date: dayjs().add(billingPeriodMonths, 'month'),
				amount: switchInformation.target.actualTotalPrice,
			},
		},
		emailAddress,
		firstName,
		lastName,
		currency,
		switchInformation.target.actualTotalPrice,
		frequency,
		paymentMethodType,
		subscriptionNumber,
		identityId,
	);

	return await sendEmail(stage, emailMessage);
};
