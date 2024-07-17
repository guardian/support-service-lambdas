import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import type dayjs from 'dayjs';

export type EmailFields = {
	firstDiscountedPaymentDate: dayjs.Dayjs;
	nextNonDiscountedPaymentDate: dayjs.Dayjs;
	emailAddress: string;
	firstName: string;
	lastName: string;
	identityId: string;
};

export const generateCancellationDiscountConfirmationEmail = ({
	firstDiscountedPaymentDate,
	nextNonDiscountedPaymentDate,
	emailAddress,
	firstName,
	lastName,
	identityId,
}: EmailFields): EmailMessageWithUserId => ({
	To: {
		Address: emailAddress,
		ContactAttributes: {
			SubscriberAttributes: {
				first_name: firstName,
				last_name: lastName,
				first_discounted_payment_date:
					firstDiscountedPaymentDate.format('DD MMMM YYYY'),
				next_non_discounted_payment_date:
					nextNonDiscountedPaymentDate.format('DD MMMM YYYY'),
			},
		},
	},
	DataExtensionName: DataExtensionNames.cancellationDiscountConfirmation,
	IdentityUserId: identityId,
});
