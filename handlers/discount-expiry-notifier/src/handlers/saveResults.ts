import { getIfDefined } from '@modules/nullAndUndefined';
import { uploadFileToS3 } from '../s3';

//todo add a type check on the input event
export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcess: Array<{
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		zuoraSubName: string;
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

	const discountExpiresOnDate = getIfDefined<string>(
		event.discountExpiresOnDate,
		'event.discountExpiresOnDate variable not set',
	);

	const executionDateTime = new Date().toISOString();

	const filePath = `${discountExpiresOnDate}/${executionDateTime}`;

	const uploadAttempt = await uploadFileToS3({
		bucketName,
		filePath,
		content: JSON.stringify(event, null, 2),
	});
	console.log('uploadAttempt', uploadAttempt);
	return {
		uploadAttempt,
		filePath,
	};
};
