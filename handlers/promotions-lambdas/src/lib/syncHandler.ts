import type { AttributeValue as SDKAttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type {
	DynamoDBBatchResponse,
	DynamoDBRecord,
	DynamoDBStreamEvent,
} from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import type { z } from 'zod';
import { writeToDynamoDb } from './dynamodb';

/**
 * Generic handler for sync'ing a source dynamodb table to a target table, with data transformation
 */

export interface SyncConfig<TSource, TTarget extends object> {
	sourceSchema: z.ZodSchema<TSource>; // to validate the data from the source table
	transform: (source: TSource) => TTarget[];
	getTableName: (stage: Stage) => string;
}

export const createSyncHandler = <TSource, TTarget extends object>(
	config: SyncConfig<TSource, TTarget>,
) => {
	const transformDynamoDbEvent = (
		event: Record<string, AttributeValue>,
	): Promise<TTarget[]> => {
		// Cast here because the type of AttributeValue differs between the dynamodb-stream and client-dynamodb libraries!
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- necessary
		const item = unmarshall(event as Record<string, SDKAttributeValue>);
		const parsed = config.sourceSchema.safeParse(item);

		if (parsed.success) {
			return Promise.resolve(config.transform(parsed.data));
		} else {
			return Promise.reject(parsed.error);
		}
	};

	const handleRecord = (
		record: DynamoDBRecord,
		stage: Stage,
	): Promise<void[]> => {
		const tableName = config.getTableName(stage);

		if (
			(record.eventName === 'INSERT' || record.eventName === 'MODIFY') &&
			record.dynamodb?.NewImage
		) {
			return transformDynamoDbEvent(record.dynamodb.NewImage).then(
				(transformedItems) =>
					Promise.all(
						transformedItems.map((item) => {
							logger.log(`Writing item to DynamoDb: ${JSON.stringify(item)}`);
							return writeToDynamoDb(item, tableName);
						}),
					),
			);
		}

		return Promise.reject(Error(`Invalid event for: ${record.eventName}`));
	};

	// build the handler
	return async (event: DynamoDBStreamEvent): Promise<DynamoDBBatchResponse> => {
		const stage = stageFromEnvironment();

		const batchItemFailures: DynamoDBBatchResponse['batchItemFailures'] = [];

		await Promise.allSettled(
			event.Records.map(async (record) => {
				try {
					logger.log('Processing record:', JSON.stringify(record.dynamodb));
					await handleRecord(record, stage);
				} catch (error) {
					logger.error(`Failed to process record:`, error);
					if (record.dynamodb?.SequenceNumber) {
						batchItemFailures.push({
							itemIdentifier: record.dynamodb.SequenceNumber,
						});
					}
				}
			}),
		);

		return { batchItemFailures };
	};
};
