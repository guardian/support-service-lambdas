/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { validateInput } from '@modules/validation/index';
import { DetectFailuresInputSchema } from '../../src/types';
import type { DetectFailuresInput } from '../../src/types';
import type { ProcessedInvoice } from '../../src/types/shared';

export const handler = async (event: DetectFailuresInput) => {
	try {
		const parsedEvent = validateInput(
			event,
			DetectFailuresInputSchema,
			'Error parsing event to type: DetectFailuresInput',
		);

		const failureDetected = await failureExistsOnInvoiceProcessingAttempt(
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

export const failureExistsOnInvoiceProcessingAttempt = async (
	processedInvoices: ProcessedInvoice[],
	s3UploadAttemptStatus: string,
): Promise<boolean> => {
	if (s3UploadAttemptStatus === 'error') {
		return true;
	}

	return processedInvoices.some((invoice) =>
		invoiceHasAtLeastOneProcessingFailure(invoice),
	);
};

export function invoiceHasAtLeastOneProcessingFailure(
	invoice: ProcessedInvoice,
): boolean {
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
}
