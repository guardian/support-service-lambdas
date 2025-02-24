/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
// import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
// import { stageFromEnvironment } from '@modules/stage';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export const SendEmailInputSchema = BaseRecordForEmailSendSchema;
export type SendEmailInput = z.infer<typeof BaseRecordForEmailSendSchema>;

export const handler = async (event: SendEmailInput) => {
	const parsedEventResult = SendEmailInputSchema.safeParse(event);
	if (!parsedEventResult.success) {
		throw new Error('Invalid event data');
	}
	const parsedEvent = parsedEventResult.data;
	const emailSendEligibility = getEmailSendEligibility(
		parsedEvent.subStatus,
		parsedEvent.workEmail,
	);

	if (!emailSendEligibility.isEligible) {
		return {
			record: parsedEvent,
			emailSendEligibility,
			emailSendAttempt: {
				response: {
					status: 'skipped',
				},
			},
		};
	}

	const currencySymbol = getCurrencySymbol(parsedEvent.paymentCurrency);

	const request = {
		...{
			To: {
				Address: parsedEvent.workEmail ?? '',
				ContactAttributes: {
					SubscriberAttributes: {
						EmailAddress: parsedEvent.workEmail ?? '',
						payment_amount: `${currencySymbol}${parsedEvent.paymentAmount}`,
						first_name: parsedEvent.firstName,
						next_payment_date: formatDate(parsedEvent.nextPaymentDate),
						payment_frequency: parsedEvent.paymentFrequency.toLowerCase(),
					},
				},
			},
			DataExtensionName: DataExtensionNames.discountExpiryNotificationEmail,
		},
		SfContactId: parsedEvent.sfContactId,
	};

	try {
		// const response = await sendEmail(stageFromEnvironment(), request);

		// if (response.$metadata.httpStatusCode !== 200) {
		// 	throw new Error('Failed to send email');
		// }
		return {
			record: parsedEvent,
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
			record: event,
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
	workEmail: string | null | undefined,
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
	workEmail: string | null | undefined,
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
