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

		const readStream = response.Body.transformToWebStream();
		readStream.on('data', (a) => {
			console.log('here');
			console.log(a);
		});

		console.log(readStream);
		return 'lksdf';
	} catch (error) {
		console.error(error);
		throw error;
	}
};
