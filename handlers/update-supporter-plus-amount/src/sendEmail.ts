import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type {
	ProductBillingPeriod,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type dayjs from 'dayjs';

export type EmailFields = {
	nextPaymentDate: dayjs.Dayjs;
	emailAddress: string;
	firstName: string;
	lastName: string;
	currency: ProductCurrency<'SupporterPlus'>;
	newAmount: number;
	billingPeriod: ProductBillingPeriod<'SupporterPlus'>;
	identityId: string;
};

export const sendThankYouEmail = async ({
	stage,
	nextPaymentDate,
	emailAddress,
	firstName,
	lastName,
	currency,
	newAmount,
	billingPeriod,
	identityId,
}: { stage: Stage } & EmailFields) => {
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

	return await sendEmail(stage, emailMessage);
};
