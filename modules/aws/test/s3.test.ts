import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getFileFromS3, streamToS3, uploadFileToS3 } from '../src/s3';

// Mock the S3Client
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/lib-storage');

const MockedS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const MockedUpload = Upload as jest.MockedClass<typeof Upload>;
const mockSend = jest.fn();
const mockUploadDone = jest.fn();

beforeEach(() => {
	MockedS3Client.mockClear();
	MockedUpload.mockClear();
	mockSend.mockClear();
	mockUploadDone.mockClear();
	MockedS3Client.prototype.send = mockSend;
	MockedUpload.prototype.done = mockUploadDone;
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

	describe('streamToS3', () => {
		beforeEach(() => {
			jest.resetAllMocks();
			console.error = jest.fn();
			console.log = jest.fn();
		});

		test('should stream data to S3', async () => {
			mockUploadDone.mockResolvedValue({});

			const testStream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('test data'));
					controller.close();
				},
			});

			await streamToS3(
				'test-bucket',
				'path/to/file.txt',
				'text/plain',
				testStream,
			);

			expect(MockedUpload).toHaveBeenCalledTimes(1);
			expect(MockedUpload).toHaveBeenCalledWith({
				client: expect.any(Object),
				params: {
					Bucket: 'test-bucket',
					Key: 'path/to/file.txt',
					Body: testStream,
					ContentType: 'text/plain',
				},
			});
			expect(mockUploadDone).toHaveBeenCalledTimes(1);
		});

		test('should stream data to S3 without content type', async () => {
			mockUploadDone.mockResolvedValue({});

			const testStream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('test data'));
					controller.close();
				},
			});

			await streamToS3('test-bucket', 'path/to/file.txt', undefined, testStream);

			expect(MockedUpload).toHaveBeenCalledTimes(1);
			expect(MockedUpload).toHaveBeenCalledWith({
				client: expect.any(Object),
				params: {
					Bucket: 'test-bucket',
					Key: 'path/to/file.txt',
					Body: testStream,
					ContentType: undefined,
				},
			});
			expect(mockUploadDone).toHaveBeenCalledTimes(1);
		});

		test('should throw error if upload fails', async () => {
			const errorMessage = 'Failed to upload stream';

			mockUploadDone.mockRejectedValue(new Error(errorMessage));

			const testStream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('test data'));
					controller.close();
				},
			});

			await expect(
				streamToS3('test-bucket', 'path/to/file.txt', 'text/plain', testStream),
			).rejects.toThrow('Failed to upload stream');

			expect(MockedUpload).toHaveBeenCalledTimes(1);
			expect(mockUploadDone).toHaveBeenCalledTimes(1);
		});
	});
});
