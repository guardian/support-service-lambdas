import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({ region: process.env.region });

export const handler = (event: { queryJobId: string }) => {
	console.log(event);
	console.log('Inside lambda...');
};
