/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { DetectFailuresInputSchema } from '../types';
import type { DetectFailuresInput } from '../types';
import type { ProcessedInvoice } from '../types/shared';

export const handler = async (event: DetectFailuresInput) => {
	try {
		const parsedEvent = DetectFailuresInputSchema.parse(event);
		const failureDetected = await failureExistsOnInvoiceProcessingAttempt(
			parsedEvent.processedInvoices,
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
	if (
		!invoice.applyCreditToAccountBalanceResult
			.applyCreditToAccountBalanceAttempt.Success ||
		!invoice.activeSubResult?.checkForActiveSubAttempt.Success
	) {
		return true;
	}

	// Only check payment method and refund attempts if hasActiveSub is false
	if (invoice.activeSubResult?.hasActiveSubscription === false) {
		if (
			!invoice.activePaymentMethodResult?.checkForActivePaymentMethodAttempt
				.Success
		) {
			return true;
		}

		// Only check refundResult if hasActivePaymentMethod is true
		if (invoice.activePaymentMethodResult.hasActivePaymentMethod === true) {
			return !invoice.refundResult?.refundAttempt.Success;
		}
	}

	return false;
}

function invoiceHasNoActiveSubAndNoActivePaymentMethod(
	invoice: ProcessedInvoice,
): boolean {
	return (
		invoice.activeSubResult?.hasActiveSubscription === false &&
		invoice.activePaymentMethodResult?.hasActivePaymentMethod === false
	);
}
