/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { DetectFailuresInputSchema } from '../types';
import type { DetectFailuresInput, ProcessedInvoice } from '../types';

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
	const {
		applyCreditToAccountBalanceResult,
		activeSubResult,
		activePaymentMethodResult,
		// refundResult,
	} = invoice;

	if (
		!applyCreditToAccountBalanceResult.applyCreditToAccountBalanceAttempt
			.Success ||
		!activeSubResult?.checkForActiveSubAttempt.Success
	) {
		return true;
	}

	// Only check payment method and refund attempts if hasActiveSub is false
	if (activeSubResult.hasActiveSubscription === false) {
		if (
			!activePaymentMethodResult?.checkForActivePaymentMethodAttempt.Success
		) {
			return true;
		}

		// Only check refundAttempt if hasActivePaymentMethod is true
		// if (activePaymentMethodResult.hasActivePaymentMethod === true) {
		// 	return !refundResult?.refundAttempt.Success;
		// }
	}

	return false;
}

function invoiceHasNoActiveSubAndNoActivePaymentMethod(
	invoice: ProcessedInvoice,
): boolean {
	const { activeSubResult, activePaymentMethodResult } = invoice;

	return (
		activeSubResult?.hasActiveSubscription === false &&
		activePaymentMethodResult?.hasActivePaymentMethod === false
	);
}
