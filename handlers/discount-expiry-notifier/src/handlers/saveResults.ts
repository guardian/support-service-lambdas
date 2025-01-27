import { uploadFileToS3 } from '../s3';

type ExpiringDiscountToProcess = {
	subName: string;
	firstName: string;
	paymentAmount: number;
	paymentFrequency: string;
	nextPaymentDate: string;
};

type ExpiringDiscountProcessingAttempt = {
	status: string;
};

type LambdaInput = {
	expiringDiscountsToProcess: ExpiringDiscountToProcess[];
	expiringDiscountProcessingAttempts: ExpiringDiscountProcessingAttempt[];
};

export const handler = async (event: LambdaInput) => {
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
