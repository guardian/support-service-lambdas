import type { BillingPeriod } from '@modules/billingPeriod';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { ProductCurrency } from '@modules/product-catalog/productCatalog';
import { getCurrencyGlyph } from '@modules/product-catalog/productCatalog';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ProductSwitchInformation } from './userInformation';

export const buildEmailMessage = (
	dateOfFirstPayment: Dayjs,
	emailAddress: string,
	firstName: string,
	lastName: string,
	currency: ProductCurrency<'SupporterPlus'>,
	productPrice: number,
	firstPaymentAmount: number,
	billingPeriod: BillingPeriod,
	subscriptionNumber: string,
	identityId: string,
) => {
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

export const sendRecurringContributionToSupporterPlusEmail = async (
	firstPaymentAmount: number,
	productSwitchInformation: ProductSwitchInformation,
) => {
	const { emailAddress, firstName, lastName, identityId } =
		productSwitchInformation.userInformation;
	const { currency, productPrice, billingPeriod } =
		productSwitchInformation.billingInformation;
	const { subscriptionNumber } =
		productSwitchInformation.subscriptionInformation;

	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		dayjs(),
		emailAddress,
		firstName,
		lastName,
		currency,
		productPrice,
		firstPaymentAmount,
		billingPeriod,
		subscriptionNumber,
		identityId,
	);

	return await sendEmail(productSwitchInformation.stage, emailMessage);
};
