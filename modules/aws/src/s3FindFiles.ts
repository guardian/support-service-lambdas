import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from './config';

const s3Client = new S3Client(awsConfig);

/**
 * Find existing files in S3 that match a pattern.
 * This is useful for finding files that were previously uploaded with a timestamp prefix.
 */
export const findExistingFilesByPattern = async ({
	bucketName,
	prefix,
	suffix,
}: {
	bucketName: string;
	prefix: string;
	suffix: string;
}): Promise<string[]> => {
	try {
		const command = new ListObjectsV2Command({
			Bucket: bucketName,
			Prefix: prefix,
		});

		const response = await s3Client.send(command);
		
		if (!response.Contents) {
			return [];
		}

		// Filter objects that end with the suffix
		const matchingFiles = response.Contents
			.filter(obj => obj.Key && obj.Key.endsWith(suffix))
			.map(obj => obj.Key!)
			.sort() // Sort to get consistent ordering (most recent by timestamp due to ISO format)
			.reverse(); // Most recent first

		return matchingFiles;
	} catch (error) {
		console.error('Error listing objects in S3:', error);
		throw error;
	}
};
