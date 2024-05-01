import type { BillingPeriod } from '@modules/billingPeriod';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { ProductCurrency } from '@modules/product-catalog/productCatalog';
import { getCurrencyGlyph } from '@modules/product-catalog/productCatalog';
import dayjs from 'dayjs';
import type { SwitchInformation } from './switchInformation';

export const buildEmailMessage = ({
	dateOfFirstPayment,
	emailAddress,
	firstName,
	lastName,
	currency,
	productPrice,
	firstPaymentAmount,
	billingPeriod,
	subscriptionNumber,
	identityId,
}: {
	dateOfFirstPayment: dayjs.Dayjs;
	emailAddress: string;
	firstName: string;
	lastName: string;
	currency: ProductCurrency<'SupporterPlus'>;
	productPrice: number;
	firstPaymentAmount: number;
	billingPeriod: BillingPeriod;
	subscriptionNumber: string;
	identityId: string;
}) => {
	return {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					currency: getCurrencyGlyph(currency),
					price: productPrice.toFixed(2),
					first_payment_amount: firstPaymentAmount.toFixed(2),
					date_of_first_payment: dateOfFirstPayment.format('DD MMMM YYYY'),
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

	const emailMessage: EmailMessageWithUserId = buildEmailMessage({
		dateOfFirstPayment: dayjs(),
		emailAddress: emailAddress,
		firstName: firstName,
		lastName: lastName,
		currency: currency,
		productPrice: switchInformation.input.price,
		firstPaymentAmount: firstPaymentAmount,
		billingPeriod: billingPeriod,
		subscriptionNumber: subscriptionNumber,
		identityId: identityId,
	});

	return await sendEmail(switchInformation.stage, emailMessage);
};
