import { InvalidRequest, NoSuchKey, NotFound } from '@aws-sdk/client-s3';
import { checkFileExistsInS3 } from '../src/s3FileExists';

describe('checkFileExistsInS3', () => {
	const bucketName = 'test-bucket';
	const filePath = 'path/to/file.txt';

	beforeEach(() => {
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should return true when file exists', async () => {
		const mockSend = jest.fn();
		mockSend.mockResolvedValue({});

		const result = await checkFileExistsInS3({
			send: mockSend,
			bucketName,
			filePath,
		});

		expect(result).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	test('should return false when file does not exist (NoSuchKey)', async () => {
		const mockSend = jest.fn();
		const error = new NoSuchKey({
			$metadata: {},
			message: 'No Such Key',
		});
		mockSend.mockRejectedValue(error);

		const result = await checkFileExistsInS3({
			send: mockSend,
			bucketName,
			filePath,
		});

		expect(result).toBe(false);
	});

	test('should return false when file does not exist (NotFound)', async () => {
		const mockSend = jest.fn();
		const error = new NotFound({
			$metadata: {},
			message: 'Not Found',
		});
		mockSend.mockRejectedValue(error);

		const result = await checkFileExistsInS3({
			send: mockSend,
			bucketName,
			filePath,
		});

		expect(result).toBe(false);
	});

	test('should throw error for non-existence related errors', async () => {
		const mockSend = jest.fn();
		const error = new InvalidRequest({
			$metadata: {},
			message: 'Access Denied',
		});
		mockSend.mockRejectedValue(error);

		await expect(
			checkFileExistsInS3({ send: mockSend, bucketName, filePath }),
		).rejects.toThrow(InvalidRequest);
	});
});
