import { S3Client } from '@aws-sdk/client-s3';
import { checkFileExistsInS3 } from '../src/s3FileExists';

// Mock the S3Client
jest.mock('@aws-sdk/client-s3');

const MockedS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockSend = jest.fn();

beforeEach(() => {
	MockedS3Client.mockClear();
	mockSend.mockClear();
	MockedS3Client.prototype.send = mockSend;
});

describe('checkFileExistsInS3', () => {
	const bucketName = 'test-bucket';
	const filePath = 'path/to/file.txt';

	beforeEach(() => {
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should return true when file exists', async () => {
		mockSend.mockResolvedValue({});

		const result = await checkFileExistsInS3({ bucketName, filePath });

		expect(result).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	test('should return false when file does not exist (NoSuchKey)', async () => {
		const error = new Error('NoSuchKey');
		error.name = 'NoSuchKey';
		mockSend.mockRejectedValue(error);

		const result = await checkFileExistsInS3({ bucketName, filePath });

		expect(result).toBe(false);
	});

	test('should return false when file does not exist (NotFound)', async () => {
		const error = new Error('NotFound');
		error.name = 'NotFound';
		mockSend.mockRejectedValue(error);

		const result = await checkFileExistsInS3({ bucketName, filePath });

		expect(result).toBe(false);
	});

	test('should return false when file does not exist (404 status)', async () => {
		const error = new Error('Not Found') as any;
		error.$metadata = { httpStatusCode: 404 };
		mockSend.mockRejectedValue(error);

		const result = await checkFileExistsInS3({ bucketName, filePath });

		expect(result).toBe(false);
	});

	test('should throw error for non-existence related errors', async () => {
		const error = new Error('Access Denied');
		error.name = 'AccessDenied';
		mockSend.mockRejectedValue(error);

		await expect(checkFileExistsInS3({ bucketName, filePath })).rejects.toThrow(
			'Access Denied',
		);
	});
});
