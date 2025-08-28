import { S3Client } from '@aws-sdk/client-s3';
import { findExistingFilesByPattern } from '../src/s3FindFiles';

// Mock the S3Client
jest.mock('@aws-sdk/client-s3');

const MockedS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockSend = jest.fn();

beforeEach(() => {
	MockedS3Client.mockClear();
	mockSend.mockClear();
	MockedS3Client.prototype.send = mockSend;
});

describe('findExistingFilesByPattern', () => {
	const bucketName = 'test-bucket';
	const prefix = 'sar-results/';
	const suffix = '-test-ref.zip';

	beforeEach(() => {
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should return matching files sorted by timestamp (most recent first)', async () => {
		const mockResponse = {
			Contents: [
				{ Key: 'sar-results/2025-08-28T10:00:00.000Z-test-ref.zip' },
				{ Key: 'sar-results/2025-08-28T09:00:00.000Z-test-ref.zip' },
				{ Key: 'sar-results/2025-08-28T11:00:00.000Z-test-ref.zip' },
				{ Key: 'sar-results/2025-08-28T10:30:00.000Z-other-ref.zip' }, // Should be filtered out
			],
		};
		mockSend.mockResolvedValue(mockResponse);

		const result = await findExistingFilesByPattern({
			bucketName,
			prefix,
			suffix,
		});

		expect(result).toEqual([
			'sar-results/2025-08-28T11:00:00.000Z-test-ref.zip', // Most recent first
			'sar-results/2025-08-28T10:00:00.000Z-test-ref.zip',
			'sar-results/2025-08-28T09:00:00.000Z-test-ref.zip',
		]);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	test('should return empty array when no files match the pattern', async () => {
		const mockResponse = {
			Contents: [
				{ Key: 'sar-results/2025-08-28T10:00:00.000Z-other-ref.zip' },
				{ Key: 'sar-results/different-file.txt' },
			],
		};
		mockSend.mockResolvedValue(mockResponse);

		const result = await findExistingFilesByPattern({
			bucketName,
			prefix,
			suffix,
		});

		expect(result).toEqual([]);
	});

	test('should return empty array when no contents found', async () => {
		const mockResponse = { Contents: undefined };
		mockSend.mockResolvedValue(mockResponse);

		const result = await findExistingFilesByPattern({
			bucketName,
			prefix,
			suffix,
		});

		expect(result).toEqual([]);
	});

	test('should handle files without Key property', async () => {
		const mockResponse = {
			Contents: [
				{ Key: 'sar-results/2025-08-28T10:00:00.000Z-test-ref.zip' },
				{}, // Object without Key property
				{ Key: 'sar-results/2025-08-28T11:00:00.000Z-test-ref.zip' },
			],
		};
		mockSend.mockResolvedValue(mockResponse);

		const result = await findExistingFilesByPattern({
			bucketName,
			prefix,
			suffix,
		});

		expect(result).toEqual([
			'sar-results/2025-08-28T11:00:00.000Z-test-ref.zip',
			'sar-results/2025-08-28T10:00:00.000Z-test-ref.zip',
		]);
	});

	test('should throw error when S3 request fails', async () => {
		const error = new Error('Access Denied');
		mockSend.mockRejectedValue(error);

		await expect(
			findExistingFilesByPattern({ bucketName, prefix, suffix }),
		).rejects.toThrow('Access Denied');
	});
});
