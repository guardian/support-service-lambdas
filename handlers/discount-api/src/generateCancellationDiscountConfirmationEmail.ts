import type {
	DataExtensionName,
	EmailMessageWithUserId,
} from '@modules/email/email';
import type dayjs from 'dayjs';

export type EmailFields = {
	firstDiscountedPaymentDate: dayjs.Dayjs;
	nextNonDiscountedPaymentDate: dayjs.Dayjs;
	emailAddress: string;
	firstName: string;
	lastName: string;
	identityId: string;
};

export const generateCancellationDiscountConfirmationEmail = (
	emailFields: EmailFields,
	dataExtensionName: DataExtensionName,
): EmailMessageWithUserId => ({
	To: {
		Address: emailFields.emailAddress,
		ContactAttributes: {
			SubscriberAttributes: {
				first_name: emailFields.firstName,
				last_name: emailFields.lastName,
				first_discounted_payment_date:
					emailFields.firstDiscountedPaymentDate.format('DD MMMM YYYY'),
				next_non_discounted_payment_date:
					emailFields.nextNonDiscountedPaymentDate.format('DD MMMM YYYY'),
			},
		},
	},
	DataExtensionName: dataExtensionName,
	IdentityUserId: emailFields.identityId,
});
