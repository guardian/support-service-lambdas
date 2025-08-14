import { streamToS3 } from '@modules/aws/s3';
import { withLogging } from '../utils/withLogging';

export interface BatonS3Writer {
	write: (reference: string, stream: ReadableStream) => Promise<string>;
}

export class BatonS3WriterImpl implements BatonS3Writer {
	constructor(
		readonly sarResultsBucket: string,
		private readonly sarS3BaseKey: string,
		private readonly now: () => Date,
	) {}

	write = async (
		reference: string,
		stream: ReadableStream,
	): Promise<string> => {
		// include date for uniqueness and reference to aid debugging.
		const fileName = this.now().toISOString() + '-' + reference + '.zip';
		const s3Key = this.sarS3BaseKey + fileName;

		await withLogging(streamToS3, undefined, undefined, 2)(
			this.sarResultsBucket,
			s3Key,
			'application/zip',
			stream,
		);
		return `s3://${this.sarResultsBucket}/${s3Key}`;
	};
}
