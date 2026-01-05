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

const defaultClient = new S3Client(awsConfig);

export const uploadFileToS3 = async ({
	bucketName,
	filePath,
	content,
	send,
}: {
	bucketName: PutObjectCommandInput['Bucket'];
	filePath: PutObjectCommandInput['Key'];
	content: PutObjectCommandInput['Body'];
	send?: typeof S3Client.prototype.send;
}) => {
	try {
		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: filePath,
			Body: content,
		});
		const response = await (send ?? defaultClient.send.bind(defaultClient))(
			command,
		);
		return response;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const getFileFromS3 = async ({
	bucketName,
	filePath,
	send,
}: {
	bucketName: GetObjectCommandInput['Bucket'];
	filePath: GetObjectCommandInput['Key'];
	send?: typeof S3Client.prototype.send;
}) => {
	try {
		const command = new GetObjectCommand({
			Bucket: bucketName,
			Key: filePath,
		});

		const response = await (send ?? defaultClient.send.bind(defaultClient))(
			command,
		);
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
	s3Bucket: string,
	s3Key: string,
	contentType: string | undefined,
	stream: ReadableStream,
) => {
	console.log(`streaming data to ${s3Bucket} ${s3Key}`);

	const upload = new Upload({
		client: defaultClient,
		params: {
			Bucket: s3Bucket,
			Key: s3Key,
			Body: stream,
			ContentType: contentType,
		},
	});

	await upload.done();
};
