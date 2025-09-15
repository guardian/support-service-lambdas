import { streamToS3 } from '@modules/aws/s3';
import { checkFileExistsInS3 } from '@modules/aws/s3FileExists';
import { BatonS3WriterImpl } from '../../src/services/batonS3Writer';

// Mock the dependencies
jest.mock('@modules/aws/s3FileExists');
jest.mock('@modules/aws/s3');

const mockCheckFileExistsInS3 = checkFileExistsInS3 as jest.MockedFunction<
	typeof checkFileExistsInS3
>;
const mockStreamToS3 = streamToS3 as jest.MockedFunction<typeof streamToS3>;

describe('BatonS3WriterImpl', () => {
	const bucketName = 'test-bucket';
	const s3BaseKey = 'sar-results/';

	let batonS3Writer: BatonS3WriterImpl;

	beforeEach(() => {
		jest.resetAllMocks();
		batonS3Writer = new BatonS3WriterImpl(bucketName, s3BaseKey);
		console.log = jest.fn();
		console.warn = jest.fn();
	});

	describe('getUrlIfExists', () => {
		it('should return S3 URL when file exists', async () => {
			const reference = 'test-reference-123';
			mockCheckFileExistsInS3.mockResolvedValue(true);

			const result = await batonS3Writer.getUrlIfExists(reference);

			expect(result).toBe(`s3://${bucketName}/${s3BaseKey}${reference}.zip`);
			expect(mockCheckFileExistsInS3).toHaveBeenCalledWith({
				bucketName,
				filePath: `${s3BaseKey}${reference}.zip`,
			});
		});

		it('should return null when file does not exist', async () => {
			const reference = 'test-reference-123';
			mockCheckFileExistsInS3.mockResolvedValue(false);

			const result = await batonS3Writer.getUrlIfExists(reference);

			expect(result).toBeNull();
		});

		it('should return null and log warning when check fails', async () => {
			const reference = 'test-reference-123';
			const error = new Error('S3 error');
			mockCheckFileExistsInS3.mockRejectedValue(error);

			const result = await batonS3Writer.getUrlIfExists(reference);

			expect(result).toBeNull();
			expect(console.warn).toHaveBeenCalledWith(
				`Error checking for existing file for reference ${reference}:`,
				error,
			);
		});
	});

	describe('write', () => {
		it('should upload stream to S3 with deterministic key', async () => {
			const reference = 'test-reference-123';
			const stream = new ReadableStream();
			const expectedS3Key = `${s3BaseKey}${reference}.zip`;
			const expectedS3Url = `s3://${bucketName}/${expectedS3Key}`;

			mockStreamToS3.mockResolvedValue();

			const result = await batonS3Writer.write(reference, stream);

			expect(result).toBe(expectedS3Url);
			expect(mockStreamToS3).toHaveBeenCalledWith(
				bucketName,
				expectedS3Key,
				'application/zip',
				stream,
			);
		});

		it('should handle different references correctly', async () => {
			const reference1 = 'abc-123';
			const reference2 = 'xyz-789';
			const stream = new ReadableStream();

			mockStreamToS3.mockResolvedValue();

			const result1 = await batonS3Writer.write(reference1, stream);
			const result2 = await batonS3Writer.write(reference2, stream);

			expect(result1).toBe(`s3://${bucketName}/${s3BaseKey}${reference1}.zip`);
			expect(result2).toBe(`s3://${bucketName}/${s3BaseKey}${reference2}.zip`);
		});
	});
});
