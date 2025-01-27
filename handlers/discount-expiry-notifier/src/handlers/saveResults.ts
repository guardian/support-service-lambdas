import { uploadFileToS3 } from '../s3';

type DiscountToProcess = {
	subName: string;
	firstName: string;
	paymentAmount: number;
	paymentFrequency: string;
	nextPaymentDate: string;
};

type DiscountProcessingAttempt = {
	status: string;
};

type StateMachineEvent = {
	discountsToProcess: DiscountToProcess[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
};

export const handler = async (event: StateMachineEvent) => {
	const bucketName = 'discount-expiry-notifier-code';

	const getCurrentDateFormatted = (): string => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const filePath = getCurrentDateFormatted();

	await uploadFileToS3({
		bucketName,
		filePath,
		content: JSON.stringify(event),
	});

	return {
		failedRowsFilePath: filePath,
	};
};
