import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from './config';

const s3Client = new S3Client(awsConfig);

/**
 * Check if a file exists in S3 without downloading it.
 * Uses HeadObject which is more efficient than GetObject for existence checks.
 */
export const checkFileExistsInS3 = async ({
	bucketName,
	filePath,
}: {
	bucketName: string;
	filePath: string;
}): Promise<boolean> => {
	try {
		const command = new HeadObjectCommand({
			Bucket: bucketName,
			Key: filePath,
		});
		await s3Client.send(command);
		return true;
	} catch (error: any) {
		if (
			error.name === 'NoSuchKey' ||
			error.name === 'NotFound' ||
			error.$metadata?.httpStatusCode === 404
		) {
			return false;
		}
		throw error;
	}
};
