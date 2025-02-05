import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';

export const handler = async (event: { 
	item: {	
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		subName: string;
		workEmail: string;
		subStatus: string;
	};
}) => {
	console.log('event:', event);
	console.log('event.item.firstName:', event.item.firstName);
	console.log('event.item.subStatus:', event.item.subStatus);
	if (event.item.subStatus === 'Cancelled') {
		return {
			detail: event,
			emailSendAttempt: {
				status: 'skipped',
				payload: {},
				response: 'Subscription status is cancelled',
			},
		};
	}
	const currencySymbol = getCurrencySymbol(event.item.paymentCurrency);

	const payload = {
		...{
			To: {
				Address: event.item.workEmail,
				ContactAttributes: {
					SubscriberAttributes: {
						EmailAddress: event.item.workEmail,
						paymentAmount: `${currencySymbol}${event.item.paymentAmount}`,
						first_name: event.item.firstName,
						date_of_payment: formatDate(event.item.nextPaymentDate),
						paymentFrequency: event.item.paymentFrequency,
					},
				},
			},
			// subscriptionCancelledEmail used for testing. will update data extension to active one when published
			DataExtensionName: DataExtensionNames.subscriptionCancelledEmail,
		},
		SfContactId: event.item.sfContactId,
	};

	const emailSendAttempt = await sendEmail(stageFromEnvironment(), payload);

	console.log('emailSendAttempt:', emailSendAttempt);
	try {
		const response = await sendEmail(stageFromEnvironment(), payload);

		return {
			detail: event,
			emailSendAttempt: {
				status: 'success',
				payload,
				response,
			},
		};
	} catch (error) {
		return {
			detail: event,
			emailSendAttempt: {
				status: 'error',
				payload,
				response: error as string,
			},
		};
	}
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
