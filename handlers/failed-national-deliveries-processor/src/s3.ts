import { S3 } from 'aws-sdk';
import type { GetObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import { credentialProvider } from 'common/aws/credentials';

export class S3Ops {
	private readonly s3: S3;

	constructor(region: string) {
		// this.s3 = new S3({ credentialProvider: credentialProvider('deployTools'), region });
        console.log('HELLO!');
    }

    

    async greeting(){
        console.log('HELLO!');
    }
    
	async getObject(params: GetObjectRequest): Promise<string> {
		const response = await this.s3.getObject(params).promise();
		const body = response.Body?.toString();

		if (!body) {
			throw new Error(`s3://${params.Bucket}/${params.Key} is empty`);
		}

		return body;
	}

	async putObject(
		bucketName: string,
		key: string,
		body: unknown,
	): Promise<void> {
		if (!shouldOutput) {
			console.info(
				`Skipping output. Would have put the following data into the following s3 bucket: ${key}`,
			);
			console.info(JSON.stringify(body, null, 2));
			return Promise.resolve();
		}

		try {
			const params: PutObjectRequest = {
				Bucket: bucketName,
				Key: key,
				Body: JSON.stringify(body),
				ContentType: 'application/json; charset=utf-8',
				ACL: 'private',
			};

			await this.s3.upload(params).promise();
		} catch (e) {
			if (e instanceof Error) {
				console.error(`Error uploading item to s3: ${e.message}`);
			} else {
				console.error(e);
			}
		}
	}
}