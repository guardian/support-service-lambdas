import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import {
	BatchGetItemCommand,
	DynamoDBClient,
	ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import type { Promo } from './schema';
import { promoSchema } from './schema';

const dynamoClient = new DynamoDBClient(awsConfig);

// DynamoDB's BatchGetItem only accepts up to 100 keys per request, and this
// module doesn't implement paging across multiple requests, so callers must
// not ask for more than this many promo codes at once.
export const batchGetItemMaxKeys = 100;

const getTableName = (stage: Stage) => `support-admin-console-promos-${stage}`;

const parsePromoItem = (item: Record<string, AttributeValue>): Promo => {
	const unmarshalledItem = unmarshall(item);
	const parseResult = promoSchema.safeParse(unmarshalledItem);
	if (!parseResult.success) {
		console.error(
			`Failed to parse promotion: ${JSON.stringify(item, null, 2)} because of error:`,
			parseResult.error,
		);
		throw new Error('Failed to parse promotion');
	}
	return parseResult.data;
};

export const getPromotions = async (stage: Stage): Promise<Promo[]> => {
	const tableName = getTableName(stage);
	logger.log(`Scanning ${tableName}`);
	const result = await dynamoClient.send(
		new ScanCommand({ TableName: tableName }),
	);

	if (result.Items === undefined) {
		throw new ReferenceError(
			`We were unable to retrieve promotions from ${tableName}`,
		);
	}

	return result.Items.map(parsePromoItem);
};

/**
 * Fetches only the promotions with the given promo codes, using DynamoDB's
 * BatchGetItem (a single set of cheap key lookups) rather than a full table
 * scan. Promo codes that don't exist in the table are silently omitted from
 * the result, rather than causing an error.
 *
 * `promoCodes` must not contain duplicates (BatchGetItem rejects requests
 * with duplicate keys), and at most `batchGetItemMaxKeys` promo codes can be
 * requested at once, since this doesn't implement paging across multiple
 * BatchGetItem requests.
 */
export const getPromotionsByCodes = async (
	promoCodes: string[],
	stage: Stage,
): Promise<Promo[]> => {
	if (promoCodes.length === 0) {
		return [];
	}
	if (promoCodes.length > batchGetItemMaxKeys) {
		throw new ValidationError(
			`Cannot fetch more than ${batchGetItemMaxKeys} unique promo codes at once, but ${promoCodes.length} were requested`,
		);
	}

	const tableName = getTableName(stage);
	logger.log(
		`Batch getting ${promoCodes.length} promo code(s) from ${tableName}`,
		{
			promoCodes,
		},
	);

	let keysToFetch: Array<Record<string, AttributeValue>> = promoCodes.map(
		(promoCode) => ({ promoCode: { S: promoCode } }),
	);
	const items: Array<Record<string, AttributeValue>> = [];

	// BatchGetItem can return UnprocessedKeys if it's throttled or the
	// response would exceed the size limit, so retry until everything has
	// been fetched.
	while (keysToFetch.length > 0) {
		const result = await dynamoClient.send(
			new BatchGetItemCommand({
				RequestItems: { [tableName]: { Keys: keysToFetch } },
			}),
		);

		items.push(...(result.Responses?.[tableName] ?? []));
		keysToFetch = result.UnprocessedKeys?.[tableName]?.Keys ?? [];
	}

	return items.map(parsePromoItem);
};
