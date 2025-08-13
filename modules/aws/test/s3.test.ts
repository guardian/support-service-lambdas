import { S3Client } from '@aws-sdk/client-s3';
import { getFileFromS3, uploadFileToS3 } from '../src/s3';

// Mock the S3Client
jest.mock('@aws-sdk/client-s3');

const MockedS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockSend = jest.fn();

beforeEach(() => {
	MockedS3Client.mockClear();
	mockSend.mockClear();
	MockedS3Client.prototype.send = mockSend;
});

describe('S3 functions', () => {
	const bucketName = 'test-bucket';
	const filePath = 'path/to/file.txt';
	const content = 'Hello, world!';

	describe('uploadFileToS3', () => {
		beforeEach(() => {
			jest.resetAllMocks();
			console.error = jest.fn();
		});

		test('should upload file to S3', async () => {
			mockSend.mockResolvedValue({});

			const result = await uploadFileToS3({ bucketName, filePath, content });

			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(result).toBeDefined();
		});

		test('should throw error if S3 request fails', async () => {
			const errorMessage = 'Failed to upload file';

			mockSend.mockRejectedValue(new Error(errorMessage));

			await expect(
				uploadFileToS3({ bucketName, filePath, content }),
			).rejects.toThrow('Failed to upload file');
		});
	});

	describe('getFileFromS3', () => {
		beforeEach(() => {
			jest.resetAllMocks();
			console.error = jest.fn();
		});

		test('should retrieve file content from S3', async () => {
			const getObjectResponse = {
				Body: {
					transformToString: jest.fn().mockReturnValue(content),
				},
			};

			mockSend.mockResolvedValue(getObjectResponse);

			const result = await getFileFromS3({
				bucketName: 'test-bucket',
				filePath: 'path/to/file.txt',
			});

			expect(result).toEqual(content);
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		test('should throw error if S3 request fails', async () => {
			const errorMessage = 'Failed to retrieve file';

			mockSend.mockRejectedValue(new Error(errorMessage));

			await expect(getFileFromS3({ bucketName, filePath })).rejects.toThrow(
				'Failed to retrieve file',
			);
		});

		test('should throw error if file content is empty', async () => {
			mockSend.mockResolvedValue({ Body: undefined });

			await expect(
				getFileFromS3({
					bucketName: 'test-bucket',
					filePath: 'path/to/file.txt',
				}),
			).rejects.toThrow('File is empty');
		});
	});
});
