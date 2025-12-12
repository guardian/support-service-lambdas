import type { DynamoDBStreamEvent } from 'aws-lambda';

export const handler = (event: DynamoDBStreamEvent): Promise<void> => {
	console.log('Running');
	event.Records.forEach((record) =>
		console.log(JSON.stringify(record.dynamodb)),
	);
	return Promise.resolve();
};
