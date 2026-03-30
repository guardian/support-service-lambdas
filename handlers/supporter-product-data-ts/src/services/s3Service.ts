import { Readable } from 'stream';
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '@modules/stage';

const bucketNameForStage = (stage: Stage): string =>
	`supporter-product-data-export-${stage.toLowerCase()}`;

export class S3Service {
	constructor(
		private readonly s3Client = new S3Client({
			region: 'eu-west-1',
			credentials: defaultProvider(),
		}),
	) {}

	async streamToS3(
		stage: Stage,
		filename: string,
		body: Uint8Array,
		length: number,
	): Promise<void> {
		const bucket = bucketNameForStage(stage);
		console.info('Uploading file to S3', {
			bucket,
			filename,
			contentLength: length,
		});
		await this.s3Client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: filename,
				Body: body,
				ContentLength: length,
			}),
		);
		console.info('Successfully uploaded file to S3', { bucket, filename });
	}

	async getObjectAsString(stage: Stage, filename: string): Promise<string> {
		const bucket = bucketNameForStage(stage);
		console.info('Downloading file from S3', { bucket, filename });
		const response = await this.s3Client.send(
			new GetObjectCommand({
				Bucket: bucket,
				Key: filename,
			}),
		);

		if (response.Body === undefined) {
			throw new Error(`Missing S3 body for ${filename}`);
		}

		const content = await response.Body.transformToString();
		console.info('Successfully downloaded file from S3', {
			bucket,
			filename,
			contentLength: content.length,
		});
		return content;
	}

	async *streamObjectLines(
		stage: Stage,
		filename: string,
	): AsyncGenerator<string> {
		const bucket = bucketNameForStage(stage);
		console.info('Streaming file from S3', { bucket, filename });

		const response = await this.s3Client.send(
			new GetObjectCommand({ Bucket: bucket, Key: filename }),
		);

		if (!(response.Body instanceof Readable)) {
			throw new Error(`Expected a Readable stream for ${filename}`);
		}

		const stream = response.Body;
		let remainder = '';

		for await (const chunk of stream) {
			const text = String(chunk);
			const lines = (remainder + text).split(/\r?\n/);
			remainder = lines.pop() ?? '';
			for (const line of lines) {
				if (line.trim().length > 0) {
					yield line;
				}
			}
		}

		if (remainder.trim().length > 0) {
			yield remainder;
		}
	}
}
