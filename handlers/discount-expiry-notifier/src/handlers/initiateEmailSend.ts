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
		zuoraSubName: string;
		workEmail: string;
		subStatus: string;
	};
}) => {
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
	if (event.item.subStatus === 'Error') {
		return {
			detail: event,
			emailSendAttempt: {
				status: 'error',
				payload: {},
				response: 'Error getting sub status from Zuora',
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
						payment_amount: `${currencySymbol}${event.item.paymentAmount}`,
						first_name: event.item.firstName,
						next_payment_date: formatDate(event.item.nextPaymentDate),
						payment_frequency: event.item.paymentFrequency,
					},
				},
			},
			DataExtensionName: DataExtensionNames.discountExpiryNotificationEmail,
		},
		SfContactId: event.item.sfContactId,
	};

	try {
		return {
			detail: event,
			emailSendAttempt: {
				status: 'success',
				payload,
				response: await sendEmail(stageFromEnvironment(), payload)
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
