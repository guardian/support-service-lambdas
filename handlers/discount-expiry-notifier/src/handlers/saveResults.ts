import { getIfDefined } from '@modules/nullAndUndefined';
import { uploadFileToS3 } from '../s3';

type ExpiringDiscountToProcess = {
	firstName: string;
	nextPaymentDate: string;
	paymentAmount: number;
	paymentCurrency: string;
	paymentFrequency: string;
	productName: string;
	sfContactId: string;
	subName: string;
	workEmail: string;
};

type ExpiringDiscountProcessingAttempt = {
	status: string;
};

type LambdaInput = {
	expiringDiscountsToProcess: ExpiringDiscountToProcess[];
	expiringDiscountProcessingAttempts: ExpiringDiscountProcessingAttempt[];
};

export const handler = async (event: LambdaInput) => {
	const bucketName = getIfDefined<string>(
		process.env.S3_BUCKET,
		'S3_BUCKET environment variable not set',
	);

	const getCurrentDateString = (): string => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
		const day = String(now.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	};

	const filePath = getCurrentDateString();

	//TODO add a precheck to find out if the file exists already and either append or create a separate file
	await uploadFileToS3({
		bucketName,
		filePath,
		content: JSON.stringify(event),
	});

	return {
		filePath,
	};
};
