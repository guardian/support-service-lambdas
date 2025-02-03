import { getIfDefined } from '@modules/nullAndUndefined';
import { uploadFileToS3 } from '../s3';

export const handler = async (event: {
	expiringDiscountsToProcess: Array<{
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		subName: string;
		workEmail: string;
	}>;
	expiringDiscountProcessingAttempts: Array<{
		status: string;
	}>;
}) => {
	const bucketName = getIfDefined<string>(
		process.env.S3_BUCKET,
		'S3_BUCKET environment variable not set',
	);

	const runForDate = '2024-10-13';
	const executionDateTime = new Date().toISOString();

	const filePath = `${runForDate}/${executionDateTime}`;

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
