import dayjs from 'dayjs';
import { describePayments } from '@modules/email/dataFields/dayZero/paymentDescription';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import type { SimpleInvoiceTotal } from '@modules/zuora/billingPreview';
import type { PaymentMethodType } from '../prepare/accountInformation';
import type { SwitchInformation } from '../prepare/switchInformation';

export const buildEmailMessage = (
	firstPaymentAmount: number,
	paymentSchedule: SimpleInvoiceTotal[],
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

	const subscriptionRate = describePayments(
		{
			payments: paymentSchedule.map(
				({ date, total, amountWithoutTax, taxAmount }) => ({
					date,
					amount: total,
					amountWithoutTax,
					taxAmount,
				}),
			),
		},
		productRatePlanKey,
		currency,
		false,
		switchInformation.target.taxMode,
	);
	const nextPaymentDate = paymentSchedule[0]?.date;

	const frequency = ({ Monthly: 'Monthly', Annual: 'Annually' } as const)[
		productRatePlanKey
	];

	return {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					currency: getCurrencyInfo(currency).extendedGlyph,
					first_payment_amount: firstPaymentAmount.toFixed(2),
					date_of_first_payment: today.format('DD MMMM YYYY'),
					date_of_next_payment:
						nextPaymentDate !== undefined
							? dayjs(nextPaymentDate).format('DD MMMM YYYY')
							: 'unknown date',
					payment_frequency: frequency,
					subscription_rate: subscriptionRate,
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
