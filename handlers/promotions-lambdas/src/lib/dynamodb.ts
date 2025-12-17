import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';

const dynamoClient = new DynamoDBClient(awsConfig);

export const writeToDynamoDb = <T extends object>(
	item: T,
	tableName: string,
): Promise<void> =>
	dynamoClient
		.send(
			new PutItemCommand({
				TableName: tableName,
				Item: marshall(item),
			}),
		)
		.then(() => undefined);

export const deleteFromDynamoDb = <T extends object>(
	key: T,
	tableName: string,
): Promise<void> =>
	dynamoClient
		.send(
			new DeleteItemCommand({
				TableName: tableName,
				Key: marshall(key),
			}),
		)
		.then(() => undefined);
