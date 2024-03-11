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

		// Readable stream to capture the response body
		const chunks: Uint8Array[] = [];
		response.Body.on('data', (chunk: Uint8Array) => {
			chunks.push(chunk);
		});

		// Promise to resolve when the stream ends
		const streamEnd = new Promise<void>((resolve, reject) => {
			response.Body.on('end', () => resolve());
			response.Body.on('error', (error) => reject(error));
		});

		// Wait for the stream to end and concatenate all chunks into a single buffer
		await streamEnd;
		const buffer = Buffer.concat(chunks);

		// Convert the buffer to a string
		const fileContent = buffer.toString();

		return fileContent;
	} catch (error) {
		console.error(error);
		throw error;
	}
};
