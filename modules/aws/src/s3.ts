import type {
	GetObjectCommandInput,
	PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { awsConfig } from './config';

const s3Client = new S3Client(awsConfig);

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
		const fileContent = response.Body?.transformToString();

		if (!fileContent) {
			throw new Error('File is empty');
		}

		return fileContent;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const streamToS3 = async (
	stream: ReadableStream,
	s3Bucket: string,
	s3Key: string,
) => {
	console.log(`streaming data to ${s3Bucket} ${s3Key}`);

	const upload = new Upload({
		client: s3Client,
		params: {
			Bucket: s3Bucket,
			Key: s3Key,
			Body: stream,
			ContentType: 'application/zip',
			ContentLength: undefined, // TBC is this needed?
		},
	});

	await upload.done();
};
