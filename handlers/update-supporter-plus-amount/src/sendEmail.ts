import type { BillingPeriod } from '@modules/billingPeriod';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { ProductCurrency } from '@modules/product-catalog/productCatalog';
import { getCurrencyGlyph } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type dayjs from 'dayjs';

export type EmailFields = {
	nextPaymentDate: dayjs.Dayjs;
	emailAddress: string;
	firstName: string;
	lastName: string;
	currency: ProductCurrency<'SupporterPlus'>;
	newAmount: number;
	billingPeriod: BillingPeriod;
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
					currency: getCurrencyGlyph(currency),
					frequency: `${billingPeriod}ly`,
					next_payment_date: nextPaymentDate.format('DD MMMM YYYY'),
				},
			},
		},
		DataExtensionName: DataExtensionNames.updateSupporterPlusAmount,
		IdentityUserId: identityId,
	};

	return await sendEmail(stage, emailMessage);
};
