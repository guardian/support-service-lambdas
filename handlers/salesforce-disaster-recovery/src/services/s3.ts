import {
	GetObjectCommand,
	type GetObjectCommandInput,
	PutObjectCommand,
	type PutObjectCommandInput,
	S3Client,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.region });

export const uploadFileToS3 = async ({
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
		const response = await s3Client.send(command);
		return response;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const getFileFromS3 = async ({
	bucketName,
	filePath,
}: {
	bucketName: GetObjectCommandInput['Bucket'];
	filePath: GetObjectCommandInput['Key'];
}) => {
	try {
		const command = new GetObjectCommand({
			Bucket: bucketName,
			Key: filePath,
		});

		const response = await s3Client.send(command);

		if (!response.Body) {
			throw new Error('File is empty');
		}

		console.log('before');
		console.log(response.Body);
		const fileContent = response.Body.transformToString();
		console.log('after');
		console.log(fileContent);

		return fileContent;
	} catch (error) {
		console.error(error);
		throw error;
	}
};
