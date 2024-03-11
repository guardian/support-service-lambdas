import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { uploadFileToS3 } from '../../src/services';

const s3ClientMock = mockClient(S3Client);

describe('S3 functions', () => {
	const bucketName = 'test-bucket';
	const filePath = 'path/to/file.txt';
	const content = 'Hello, world!';

	describe('uploadFileToS3', () => {
		beforeEach(() => {
			s3ClientMock.reset();
			jest.resetAllMocks();
			console.error = jest.fn();
		});

		test('should upload file to S3', async () => {
			s3ClientMock.on(PutObjectCommand).resolves({});

			await uploadFileToS3({ bucketName, filePath, content });

			expect(s3ClientMock.calls().length).toEqual(1);
			const uploadArgs = s3ClientMock.call(0).firstArg as PutObjectCommand;
			expect(uploadArgs.input.Bucket).toEqual('test-bucket');
			expect(uploadArgs.input.Key).toEqual(`path/to/file.txt`);
			expect(uploadArgs.input.Body).toEqual('Hello, world!');
		});

		test('should throw error if S3 request fails', async () => {
			const errorMessage = 'Failed to upload file';

			s3ClientMock.on(PutObjectCommand).rejects(new Error(errorMessage));

			await expect(
				uploadFileToS3({ bucketName, filePath, content }),
			).rejects.toThrow('Failed to upload file');
		});
	});

	// describe('getFileFromS3', () => {
	// 	beforeEach(() => {
	// 		s3ClientMock.reset();
	// 		jest.resetAllMocks();
	// 		console.error = jest.fn();
	// 	});

	// 	test('should retrieve file content from S3', async () => {
	// 		const getObjectResponse = {
	// 			Body: {
	// 				transformToString: jest.fn().mockReturnValue(content),
	// 			},
	// 		};

	// 		// @ts-expect-error I can't make TypeScript happy
	// 		s3ClientMock.on(GetObjectCommand).resolves(getObjectResponse);

	// 		const result = await getFileFromS3({
	// 			bucketName: 'test-bucket',
	// 			filePath: 'path/to/file.txt',
	// 		});

	// 		expect(result).toEqual(content);
	// 		expect(s3ClientMock.calls().length).toEqual(1);
	// 		const getObjectArgs = s3ClientMock.call(0).firstArg as GetObjectCommand;
	// 		expect(getObjectArgs.input.Bucket).toEqual('test-bucket');
	// 		expect(getObjectArgs.input.Key).toEqual('path/to/file.txt');
	// 	});

	// 	test('should throw error if S3 request fails', async () => {
	// 		const errorMessage = 'Failed to retrieve file';

	// 		s3ClientMock.on(GetObjectCommand).rejects(new Error(errorMessage));

	// 		await expect(getFileFromS3({ bucketName, filePath })).rejects.toThrow(
	// 			'Failed to retrieve file',
	// 		);
	// 	});

	// 	test('should throw error if file content is empty', async () => {
	// 		s3ClientMock.on(GetObjectCommand).resolves({ Body: undefined });

	// 		await expect(
	// 			getFileFromS3({
	// 				bucketName: 'test-bucket',
	// 				filePath: 'path/to/file.txt',
	// 			}),
	// 		).rejects.toThrow('File is empty');
	// 	});
	// });
});
