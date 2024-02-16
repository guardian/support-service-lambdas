import {
	PutObjectCommand,
	type PutObjectCommandInput,
	S3Client,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.region });

export const upsertFileToS3 = async ({
	bucketName,
	filePath,
	content,
}: {
	bucketName: PutObjectCommandInput['Bucket'];
	filePath: PutObjectCommandInput['Key'];
	content: PutObjectCommandInput['Body'];
}) => {
	try {
		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: filePath,
			Body: content,
		});
		await s3Client.send(command);
	} catch (error) {
		console.error(error);
		throw error;
	}
};
