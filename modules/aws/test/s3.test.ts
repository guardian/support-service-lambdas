import { getFileFromS3, uploadFileToS3 } from '../src/s3';

describe('S3 functions', () => {
	const bucketName = 'test-bucket';
	const filePath = 'path/to/file.txt';
	const content = 'Hello, world!';

	describe('uploadFileToS3', () => {
		test('should upload file to S3', async () => {
			const mockSend = jest.fn();
			mockSend.mockResolvedValue({});

			const result = await uploadFileToS3({
				send: mockSend,
				bucketName,
				filePath,
				content,
			});

			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(result).toBeDefined();
		});

		test('should throw error if S3 request fails', async () => {
			const mockSend = jest.fn();
			const errorMessage = 'Failed to upload file';

			mockSend.mockRejectedValue(new Error(errorMessage));

			await expect(
				uploadFileToS3({ send: mockSend, bucketName, filePath, content }),
			).rejects.toThrow('Failed to upload file');
		});
	});

	describe('getFileFromS3', () => {
		test('should retrieve file content from S3', async () => {
			const mockSend = jest.fn();
			const getObjectResponse = {
				Body: {
					transformToString: jest.fn().mockReturnValue(content),
				},
			};

			mockSend.mockResolvedValue(getObjectResponse);

			const result = await getFileFromS3({
				send: mockSend,
				bucketName: 'test-bucket',
				filePath: 'path/to/file.txt',
			});

			expect(result).toEqual(content);
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		test('should throw error if S3 request fails', async () => {
			const mockSend = jest.fn();
			const errorMessage = 'Failed to retrieve file';

			mockSend.mockRejectedValue(new Error(errorMessage));

			await expect(
				getFileFromS3({ send: mockSend, bucketName, filePath }),
			).rejects.toThrow('Failed to retrieve file');
		});

		test('should throw error if file content is empty', async () => {
			const mockSend = jest.fn();
			mockSend.mockResolvedValue({ Body: undefined });

			await expect(
				getFileFromS3({
					send: mockSend,
					bucketName: 'test-bucket',
					filePath: 'path/to/file.txt',
				}),
			).rejects.toThrow('File is empty');
		});
	});
});
