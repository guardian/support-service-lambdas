import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { upsertFileToS3 } from '../../src/services';

const s3ClientMock = mockClient(S3Client);

describe('upsertFileToS3', () => {
	beforeEach(() => {
		s3ClientMock.reset();
		jest.resetAllMocks();
	});

	test('should upload file to S3', async () => {
		// Arrange
		const bucketName = 'test-bucket';
		const filePath = 'path/to/file.txt';
		const content = 'Hello, world!';

		s3ClientMock.on(PutObjectCommand).resolves({});

		// Act
		await upsertFileToS3({ bucketName, filePath, content });

		// Assert
		expect(s3ClientMock.calls().length).toEqual(1);
		const uploadArgs = s3ClientMock.call(0).firstArg as PutObjectCommand;
		expect(uploadArgs.input.Bucket).toEqual('test-bucket');
		expect(uploadArgs.input.Key).toEqual(`path/to/file.txt`);
		expect(uploadArgs.input.Body).toEqual('Hello, world!');
	});
});
