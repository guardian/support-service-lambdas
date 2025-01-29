import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';

export const handler = async (event: {
	subName: string;
	firstName: string;
	paymentCurrency: string;
	paymentAmount: number;
	paymentFrequency: string;
	nextPaymentDate: string;
}) => {
	const currencySymbol = getCurrencySymbol(event.paymentCurrency);

	const emailMessageWithUserId = {
		...{
			To: {
				Address: 'david.pepper@guardian.co.uk',
				ContactAttributes: {
					SubscriberAttributes: {
						EmailAddress: 'david.pepper@guardian.co.uk',
						paymentAmount: `${currencySymbol}${event.paymentAmount}`,
						first_name: event.firstName,
						date_of_payment: formatDate(event.nextPaymentDate),
						paymentFrequency: event.paymentFrequency,
					},
				},
			},
			// subscriptionCancelledEmail used for testing. will update data extension to active one when published
			DataExtensionName: DataExtensionNames.subscriptionCancelledEmail,
		},
		SfContactId: '0039E00001HiIGlQAN',
	};

	console.log('emailMessageWithUserId:',emailMessageWithUserId);
	const emailSend = await sendEmail(
		stageFromEnvironment(),
		emailMessageWithUserId,
	);

	console.log('emailSend:', emailSend);

	return emailSend;
};

function formatDate(inputDate: string): string {
	return new Date(inputDate).toLocaleDateString('en-GB', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});
}

function getCurrencySymbol(currencyCode: string): string {
	const symbols: Record<string, string> = {
		GBP: '£',
		AUD: '$',
		EUR: '€',
		USD: '$',
		CAD: '$',
		NZD: '$',
	};
	return symbols[currencyCode] ?? '';
}
