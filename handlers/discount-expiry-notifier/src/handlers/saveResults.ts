import { getIfDefined } from '@modules/nullAndUndefined';
import { uploadFileToS3 } from '../s3';
import type {
	DiscountProcessingAttempt,
	ExpiringDiscountToProcess,
	FilteredSub,
} from '../types';

export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcessCount: number;
	expiringDiscountsToProcess: ExpiringDiscountToProcess[];
	filteredSubsCount: number;
	filteredSubs: FilteredSub[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
}) => {
	try {
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

		const s3UploadAttempt = await uploadFileToS3({
			bucketName,
			filePath,
			content: JSON.stringify(event, null, 2),
		});

		return {
			...event,
			s3UploadAttemptStatus: 'success',
			s3UploadAttempt,
			filePath,
		};
	} catch (error) {
		return {
			...event,
			s3UploadAttemptStatus: 'error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
