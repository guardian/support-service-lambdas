import type { Handler, S3CreateEvent } from 'aws-lambda';

export const handler: Handler = (event: S3CreateEvent) => {
	console.log(`Input is ${JSON.stringify(event)}`);
};
