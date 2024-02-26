import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { uploadFileToS3 } from '../../src/services';

const s3ClientMock = mockClient(S3Client);

describe('uploadFileToS3', () => {
	const bucketName = 'test-bucket';
	const filePath = 'path/to/file.txt';
	const content = 'Hello, world!';

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
