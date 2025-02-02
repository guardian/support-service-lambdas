import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';

export const handler = async (event: {
	firstName: string;
	nextPaymentDate: string;
	paymentAmount: number;
	paymentCurrency: string;
	paymentFrequency: string;
	productName: string;
	sfContactId: string;
	subName: string;
	workEmail: string;
}) => {
	const currencySymbol = getCurrencySymbol(event.paymentCurrency);

	const payload = {
		...{
			To: {
				Address: 'david.pepper@guardian.co.uk', // hard code this during testing
				ContactAttributes: {
					SubscriberAttributes: {
						EmailAddress: 'david.pepper@guardian.co.uk', // hard code this during testing
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
		SfContactId: event.sfContactId,
	};

	const emailSend = await sendEmail(stageFromEnvironment(), payload);

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
