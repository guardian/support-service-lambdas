import { S3 } from 'aws-sdk';
import type { GetObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import { credentialProvider } from './credentials';

export class S3Ops {
	private readonly s3: S3;

	constructor(region: string) {
		console.log('In constructor...');
		console.log('region:', region);

		this.s3 = new S3({ credentialProvider: credentialProvider('membership'), region });
        
    }

	async getObject(params: GetObjectRequest): Promise<string> {
		console.log('In getObject...');
		console.log('params:',params);

		const response = await this.s3.getObject(params).promise();
		const body = response.Body?.toString();

		if (!body) {
			throw new Error(`s3://${params.Bucket}/${params.Key} is empty`);
		}

		return body;
	}
}