import {
	HeadObjectCommand,
	NoSuchKey,
	NotFound,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3';
import { awsConfig } from './config';

const defaultClient: S3Client = new S3Client(awsConfig);

/**
 * Check if a file exists in S3 without downloading it.
 * Uses HeadObject which is more efficient than GetObject for existence checks.
 */
export const checkFileExistsInS3 = async ({
	bucketName,
	filePath,
	send,
}: {
	bucketName: string;
	filePath: string;
	send?: typeof S3Client.prototype.send;
}): Promise<boolean> => {
	try {
		const command = new HeadObjectCommand({
			Bucket: bucketName,
			Key: filePath,
		});
		await (send ?? defaultClient.send.bind(defaultClient))(command);
		return true;
	} catch (error) {
		if (
			error instanceof NoSuchKey ||
			error instanceof NotFound ||
			(error instanceof S3ServiceException &&
				error.$metadata.httpStatusCode === 404)
		) {
			return false;
		}
		throw error;
	}
};
