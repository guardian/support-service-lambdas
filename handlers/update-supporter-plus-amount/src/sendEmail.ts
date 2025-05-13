import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import type { Currency } from '@modules/internationalisation/currency';
import type { ProductBillingPeriod } from '@modules/product-catalog/newProductCatalogTypes';
import type dayjs from 'dayjs';

export type EmailFields = {
	nextPaymentDate: dayjs.Dayjs;
	emailAddress: string;
	firstName: string;
	lastName: string;
	currency: Currency;
	newAmount: number;
	billingPeriod: ProductBillingPeriod<'SupporterPlus'>;
	identityId: string;
};

export const createThankYouEmail = ({
	nextPaymentDate,
	emailAddress,
	firstName,
	lastName,
	currency,
	newAmount,
	billingPeriod,
	identityId,
}: EmailFields) => {
	const emailMessage: EmailMessageWithUserId = {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: firstName,
					last_name: lastName,
					new_amount: newAmount.toFixed(2),
					currency: currency,
					frequency: billingPeriod,
					next_payment_date: nextPaymentDate.format('DD MMMM YYYY'),
				},
			},
		},
		DataExtensionName: DataExtensionNames.updateSupporterPlusAmount,
		IdentityUserId: identityId,
	};

	return emailMessage;
};
