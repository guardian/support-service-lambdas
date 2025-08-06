import type {
	GetObjectCommandInput,
	PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { Upload } from '@aws-sdk/lib-storage';
import { awsConfig } from './config';

const s3Client = new S3Client(awsConfig);

const contentLengthSchema = z.string().transform((val, ctx) => {
	const parsed = parseInt(val, 10);
	if (isNaN(parsed)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Content-Length header is not a valid number',
		});
		return z.NEVER;
	}
	return parsed;
});

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

export const streamHttpToS3 = async (
	httpSourceUrl: string,
	s3Bucket: string,
	s3Key: string,
) => {
	console.log(`copying ${httpSourceUrl} to ${s3Bucket} ${s3Key}`);
	const response = await fetch(httpSourceUrl);
	if (!response.ok) {
		throw new Error(
			`HTTP error! status: ${response.status} for ${httpSourceUrl}`,
		);
	}
	if (!response.body) {
		throw new Error(`missing HTTP body for ${httpSourceUrl}`);
	}

	const contentLength = contentLengthSchema.parse(
		response.headers.get('content-length'),
	);
	console.log('http body is length', contentLength);

	const upload = new Upload({
		client: s3Client,
		params: {
			Bucket: s3Bucket,
			Key: s3Key,
			Body: Readable.fromWeb(response.body),
			ContentType: 'application/zip',
			ContentLength: contentLength,
		},
	});

	await upload.done();
};
