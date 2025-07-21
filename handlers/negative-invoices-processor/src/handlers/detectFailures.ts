/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { DetectFailuresInputSchema } from '../types';
import type { DetectFailuresInput } from '../types';
import type { ProcessedInvoice } from '../types/shared';

export const handler = async (event: DetectFailuresInput) => {
	try {
		const parsedEvent = DetectFailuresInputSchema.parse(event);
		const processedInvoices =
			parsedEvent.processedInvoices as ProcessedInvoice[];
		const failureDetected = await failureExistsOnInvoiceProcessingAttempt(
			processedInvoices,
			parsedEvent.s3UploadAttemptStatus,
		);

		if (failureDetected) {
			throw new Error(
				`Something went wrong during invoice processing. Inspect payload for details: ${JSON.stringify(parsedEvent, null, 2)}`,
			);
		}
	} catch (error) {
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
	return (
		atLeastOneCalloutFailed(invoice) ||
		invoiceHasNoActiveSubAndNoActivePaymentMethod(invoice)
	);
}

function atLeastOneCalloutFailed(invoice: ProcessedInvoice): boolean {
	const {
		applyCreditToAccountBalanceAttempt,
		checkForActiveSubAttempt,
		checkForActivePaymentMethodAttempt,
		refundResult,
	} = invoice;

	if (
		!applyCreditToAccountBalanceAttempt.Success ||
		!checkForActiveSubAttempt?.Success
	) {
		return true;
	}

	// Only check payment method and refund attempts if hasActiveSub is false
	if (checkForActiveSubAttempt.hasActiveSub === false) {
		if (!checkForActivePaymentMethodAttempt?.Success) {
			return true;
		}

		// Only check refundResult if hasActivePaymentMethod is true
		if (checkForActivePaymentMethodAttempt.hasActivePaymentMethod === true) {
			return !refundResult?.Success;
		}
	}

	return false;
}

function invoiceHasNoActiveSubAndNoActivePaymentMethod(
	invoice: ProcessedInvoice,
): boolean {
	const { checkForActiveSubAttempt, checkForActivePaymentMethodAttempt } =
		invoice;

	return (
		checkForActiveSubAttempt?.hasActiveSub === false &&
		checkForActivePaymentMethodAttempt?.hasActivePaymentMethod === false
	);
}
