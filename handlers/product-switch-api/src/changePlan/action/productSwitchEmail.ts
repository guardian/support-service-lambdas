import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import dayjs from 'dayjs';
import { Stage } from '@modules/stage';
import { SwitchInformation } from '../prepare/switchInformation';

type Payment = { date: dayjs.Dayjs; amount: number };

export const buildEmailMessage = (
	payments: { first: Payment; next: Payment },
	emailAddress: string,
	firstName: string,
	lastName: string,
	currency: IsoCurrency,
	productPrice: number,
	frequency: string,
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
					currency: getCurrencyInfo(currency).extendedGlyph,
					price: productPrice.toFixed(2),
					first_payment_amount: first.amount.toFixed(2),
					date_of_first_payment: first.date.format('DD MMMM YYYY'),
					next_payment_amount: next.amount.toFixed(2),
					date_of_next_payment: next.date.format('DD MMMM YYYY'),
					payment_frequency: frequency,
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
	stage: Stage,
	firstPaymentAmount: number,
	switchInformation: SwitchInformation,
) => {
	const { emailAddress, firstName, lastName, identityId, currency } =
		switchInformation.account;
	const { subscriptionNumber, productRatePlanKey } =
		switchInformation.subscription;

	const [billingPeriodMonths, frequency] = (
		{
			Monthly: [1, 'Monthly'],
			Annual: [12, 'Annually'],
		} as const
	)[productRatePlanKey];

	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
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
		subscriptionNumber,
		identityId,
	);

	return await sendEmail(stage, emailMessage);
};
