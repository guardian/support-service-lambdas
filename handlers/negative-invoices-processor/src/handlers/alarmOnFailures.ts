/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { validateInput } from '@modules/validation/index';
import { AlarmOnFailuresInputSchema } from '../types';
import type { AlarmOnFailuresInput, ProcessedInvoice } from '../types';

export const handler = async (event: AlarmOnFailuresInput) => {
	try {
		const parsedEvent = validateInput(
			event,
			AlarmOnFailuresInputSchema,
			'Error parsing event to type: AlarmOnFailuresInput',
		);

		const failureDetected = await failuresExist(
			parsedEvent.processedInvoices,
			parsedEvent.s3UploadAttemptStatus,
		);

		if (failureDetected) {
			throw new Error('Failure occurred. Check logs.');
		}
	} catch (error) {
		console.log('Error occurred:', error);
		throw new Error(
			error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		);
	}
	return {};
};

export const failuresExist = async (
	processedInvoices: ProcessedInvoice[],
	s3UploadAttemptStatus: string,
): Promise<boolean> => {
	if (s3UploadAttemptStatus === 'error') {
		return true;
	}

	return processedInvoices.some((invoice) => {
		const {
			applyCreditToAccountBalanceAttempt,
			checkForActiveSubAttempt,
			checkForActivePaymentMethodAttempt,
		} = invoice;

		return (
			!applyCreditToAccountBalanceAttempt.Success ||
			!checkForActiveSubAttempt?.Success ||
			!checkForActivePaymentMethodAttempt?.Success
		);
	});
};
