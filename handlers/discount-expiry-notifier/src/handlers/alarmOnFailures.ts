/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import type {
	DiscountProcessingAttempt,
	ExpiringDiscountsToProcess,
	FilteredSubs,
} from '../types';

export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcessCount: number;
	expiringDiscountsToProcess: ExpiringDiscountsToProcess[];
	filteredSubsCount: number;
	filteredSubs: FilteredSubs[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
	uploadAttemptStatus: string;
}) => {
	console.log('event', event);

	if (
		await errorsOccurred(
			event.discountProcessingAttempts,
			event.uploadAttemptStatus,
		)
	) {
		throw new Error('Errors occurred. Check logs.');
	}
	return {};
};

const errorsOccurred = async (
	discountProcessingAttempts: DiscountProcessingAttempt[],
	uploadAttemptStatus: string,
): Promise<boolean> => {
	return (
		uploadAttemptStatus === 'error' ||
		discountProcessingAttempts.some(
			(attempt) => attempt.emailSendAttempt.status === 'error',
		)
	);
};
