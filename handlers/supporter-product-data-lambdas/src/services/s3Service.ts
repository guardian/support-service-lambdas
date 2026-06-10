import { Readable } from 'stream';
import { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';

const bucketNameForStage = (stage: Stage): string =>
	`supporter-product-data-export-${stage.toLowerCase()}`;

export class S3Service {
	constructor(private readonly s3Client = new S3Client(awsConfig)) {}

	async streamToS3(
		stage: Stage,
		filename: string,
		body: ReadableStream<Uint8Array>,
	): Promise<void> {
		const bucket = bucketNameForStage(stage);
		logger.log('Uploading file to S3', { bucket, filename });
		await new Upload({
			client: this.s3Client,
			params: {
				Bucket: bucket,
				Key: filename,
				Body: body,
			},
		}).done();
		logger.log('Successfully uploaded file to S3', { bucket, filename });
	}

	async *streamObjectLines(
		stage: Stage,
		filename: string,
	): AsyncGenerator<string> {
		const bucket = bucketNameForStage(stage);
		logger.log('Streaming file from S3', { bucket, filename });

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
