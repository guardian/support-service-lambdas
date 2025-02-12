import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';
import type { BaseRecordForEmailSend } from '../types';

export const handler = async (event: { item: BaseRecordForEmailSend }) => {
	const emailSendEligibility = getEmailSendEligibility(
		event.item.subStatus,
		event.item.workEmail,
	);

	if (!emailSendEligibility.isEligible) {
		return {
			record: event.item,
			emailSendAttempt: {
				status: 'skipped',
				response: emailSendEligibility.ineligibilityReason,
			},
		};
	}

	const currencySymbol = getCurrencySymbol(event.item.paymentCurrency);

	const request = {
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
		const response = await sendEmail(stageFromEnvironment(), request);

		if (response.$metadata.httpStatusCode !== 200) {
			throw new Error('Failed to send email');
		}
		return {
			record: event.item,
			emailSendEligibility,
			emailSendAttempt: {
				request,
				response: {
					status: 'success',
				},
			},
		};
	} catch (error) {
		return {
			record: event.item,
			emailSendEligibility,
			emailSendAttempt: {
				request,
				response: {
					status: 'error',
					errorDetail: JSON.stringify(error, null, 2),
				},
			},
		};
	}
};

function getIneligibilityReason(
	subStatus: string,
	workEmail: string | undefined,
) {
	if (subStatus === 'Cancelled') {
		return 'Subscription status is cancelled';
	}
	if (subStatus === 'Error') {
		return 'Error getting sub status from Zuora';
	}
	if (!workEmail) {
		return 'No value for work email';
	}
	return '';
}
function getEmailSendEligibility(
	subStatus: string,
	workEmail: string | undefined,
) {
	return {
		isEligible: subStatus === 'Active' && !!workEmail,
		ineligibilityReason: getIneligibilityReason(subStatus, workEmail),
	};
}

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
