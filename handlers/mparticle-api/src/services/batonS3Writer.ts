import { streamToS3 } from '@modules/aws/s3';
import { checkFileExistsInS3 } from '@modules/aws/s3FileExists';
import { withLogging } from '../utils/withLogging';

export interface BatonS3Writer {
	write: (reference: string, stream: ReadableStream) => Promise<string>;
	getUrlIfExists: (reference: string) => Promise<string | null>;
}

export class BatonS3WriterImpl implements BatonS3Writer {
	constructor(
		readonly sarResultsBucket: string,
		private readonly sarS3BaseKey: string,
	) {}

	private generateS3Key(reference: string): string {
		return `${this.sarS3BaseKey}${reference}.zip`;
	}

	/**
	 * Check if a file already exists for the given reference.
	 * Returns the S3 URL if found, null if not found.
	 * Uses deterministic naming for direct lookup.
	 */
	getUrlIfExists = async (reference: string): Promise<string | null> => {
		try {
			const s3Key = this.generateS3Key(reference);
			const exists = await checkFileExistsInS3({
				bucketName: this.sarResultsBucket,
				filePath: s3Key,
			});

			if (exists) {
				console.log(`Found existing file for reference ${reference}: ${s3Key}`);
				return `s3://${this.sarResultsBucket}/${s3Key}`;
			}

			return null;
		} catch (error) {
			console.warn(
				`Error checking for existing file for reference ${reference}:`,
				error,
			);
			return null;
		}
	};

	write = async (
		reference: string,
		stream: ReadableStream,
	): Promise<string> => {
		const s3Key = this.generateS3Key(reference);

		await withLogging(streamToS3, undefined, undefined, 2)(
			this.sarResultsBucket,
			s3Key,
			'application/zip',
			stream,
		);
		return `s3://${this.sarResultsBucket}/${s3Key}`;
	};
}
