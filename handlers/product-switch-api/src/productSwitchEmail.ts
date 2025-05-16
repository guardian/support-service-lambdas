import type { BillingPeriod } from '@modules/billingPeriod';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { Currency } from '@modules/internationalisation/currency';
import { getCurrencyGlyph } from '@modules/internationalisation/currency';
import dayjs from 'dayjs';
import type { SwitchInformation } from './switchInformation';

type Payment = { date: dayjs.Dayjs; amount: number };

export const buildEmailMessage = (
	payments: { first: Payment; next: Payment },
	emailAddress: string,
	firstName: string,
	lastName: string,
	currency: Currency,
	productPrice: number,
	billingPeriod: BillingPeriod,
	subscriptionNumber: string,
	identityId: string,
) => {
	const { first, next } = payments;
	return {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					currency: getCurrencyGlyph(currency),
					price: productPrice.toFixed(2),
					first_payment_amount: first.amount.toFixed(2),
					date_of_first_payment: first.date.format('DD MMMM YYYY'),
					next_payment_amount: next.amount.toFixed(2),
					date_of_next_payment: next.date.format('DD MMMM YYYY'),
					payment_frequency: `${billingPeriod}ly`,
					subscription_id: subscriptionNumber,
				},
			},
		},
		DataExtensionName:
			DataExtensionNames.recurringContributionToSupporterPlusSwitch,
		IdentityUserId: identityId,
	};
};

export const sendThankYouEmail = async (
	firstPaymentAmount: number,
	switchInformation: SwitchInformation,
) => {
	const { emailAddress, firstName, lastName, identityId } =
		switchInformation.account;
	const { subscriptionNumber, currency, billingPeriod } =
		switchInformation.subscription;

	const billingPeriodMonths: number =
		switchInformation.subscription.billingPeriod == 'Month'
			? 1
			: switchInformation.subscription.billingPeriod == 'Annual'
				? 12
				: switchInformation.subscription.billingPeriod == 'Quarter'
					? 3
					: 1;

	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		{
			first: {
				date: dayjs(),
				amount: firstPaymentAmount,
			},
			next: {
				date: dayjs().add(billingPeriodMonths, 'month'),
				amount: switchInformation.actualTotalPrice,
			},
		},
		emailAddress,
		firstName,
		lastName,
		currency,
		switchInformation.actualTotalPrice,
		billingPeriod,
		subscriptionNumber,
		identityId,
	);

	return await sendEmail(switchInformation.stage, emailMessage);
};
