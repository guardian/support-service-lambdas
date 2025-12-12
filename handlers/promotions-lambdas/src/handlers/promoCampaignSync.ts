import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';

export const handler: DynamoDBStreamHandler = (event: DynamoDBStreamEvent) => {
	console.log('Running');
	event.Records.forEach((record) =>
		console.log(JSON.stringify(record.dynamodb)),
	);
};
