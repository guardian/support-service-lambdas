// TODO:delete comment - imports
import {
	DynamoDBClient,
	BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { z } from 'zod';
import { logger } from '@modules/routing/logger';
import { loadConfig } from '@modules/aws/appConfig';

// TODO:delete comment - sleep helper for exponential backoff
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// TODO:delete comment - generic batch put; caller supplies zod schema and stage
export const batchPutItems = async <T>(
	stage: string,
	tableName: string,
	rawItems: unknown[],
	itemSchema: z.ZodSchema<T>,
	{
		maxRetries = 8,
		baseDelayMs = 100,
	}: {
		maxRetries?: number;
		baseDelayMs?: number;
	} = {},
) => {
	// TODO:delete comment - load any needed config (example only; remove if unused)
	await loadConfig(
		stage,
		'support',
		'dynamodb-batch-writer',
		z.object({}).optional(),
	);

	// TODO:delete comment - validate items with zod
	const items: T[] = rawItems.map((r, i) => {
		try {
			return itemSchema.parse(r);
		} catch (e) {
			logger.log(
				'info',
				`Rejected item at index ${i} due to schema validation error ${(e as Error).message}`,
			);
			throw e;
		}
	});

	const MAX_BATCH = 25;
	let successCount = 0;
	let attemptBatches = 0;

	// TODO:delete comment - chunk items
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += MAX_BATCH) {
		batches.push(items.slice(i, i + MAX_BATCH));
	}

	logger.log(
		'info',
		`Starting batch put stage=${stage} table=${tableName} totalItems=${items.length} totalBatches=${batches.length}`,
	);

	// TODO:delete comment - process each batch with retries for unprocessed items
	for (let bIndex = 0; bIndex < batches.length; bIndex++) {
		let pending = batches[bIndex];
		let attempt = 0;
		while (pending.length) {
			attempt++;
			attemptBatches++;
			// TODO:delete comment - build write requests
			const requestItems = {
				[tableName]: pending.map((item) => ({
					PutRequest: {
						Item: objectToAttributeMap(item),
					},
				})),
			};
			logger.log(
				'info',
				`Sending BatchWriteItem batchIndex=${bIndex} attempt=${attempt} size=${pending.length} body=${JSON.stringify(
					pending,
				)}`,
			);

			const resp = await new DynamoDBClient({}).send(
				new BatchWriteItemCommand({ RequestItems: requestItems }),
			);

			logger.log(
				'info',
				`Received BatchWriteItem response batchIndex=${bIndex} attempt=${attempt} body=${JSON.stringify(resp)}`,
			);

			const unprocessed =
				resp.UnprocessedItems?.[tableName]?.map((wr) =>
					attributeMapToObject(wr.PutRequest?.Item ?? {}),
				) ?? [];

			const processedCount = pending.length - unprocessed.length;
			successCount += processedCount;

			if (!unprocessed.length) {
				pending = [];
				break;
			}

			if (attempt >= maxRetries) {
				logger.log(
					'info',
					`Giving up on ${unprocessed.length} items after maxRetries batchIndex=${bIndex}`,
				);
				throw new Error(
					`Unprocessed items remained after ${maxRetries} retries: ${JSON.stringify(
						unprocessed,
					)}`,
				);
			}

			const delay =
				baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 50);
			logger.log(
				'info',
				`Retrying ${unprocessed.length} unprocessed items batchIndex=${bIndex} in ${delay}ms`,
			);
			await sleep(delay);
			pending = unprocessed as T[];
		}
	}

	logger.log(
		'info',
		`Completed batch put table=${tableName} successCount=${successCount} totalAttempts=${attemptBatches}`,
	);

	return { successCount };
};

// TODO:delete comment - convert plain object to DynamoDB AttributeValue map (minimal types)
const objectToAttributeMap = (obj: Record<string, any>) => {
	const out: Record<string, any> = {};
	Object.entries(obj).forEach(([k, v]) => {
		if (v === null || v === undefined) return;
		switch (typeof v) {
			case 'string':
				out[k] = { S: v };
				break;
			case 'number':
				out[k] = { N: v.toString() };
				break;
			case 'boolean':
				out[k] = { BOOL: v };
				break;
			case 'object':
				if (Array.isArray(v)) {
					if (v.every((x) => typeof x === 'string')) out[k] = { SS: v };
					else out[k] = { L: v.map((x) => ({ S: String(x) })) };
				} else {
					out[k] = { M: objectToAttributeMap(v) };
				}
				break;
			default:
				out[k] = { S: String(v) };
		}
	});
	return out;
};

// TODO:delete comment - inverse transform (used for unprocessed items mapping)
const attributeMapToObject = (
	attr: Record<string, any>,
): Record<string, any> => {
	const out: Record<string, any> = {};
	Object.entries(attr).forEach(([k, v]) => {
		if (v.S !== undefined) out[k] = v.S;
		else if (v.N !== undefined) out[k] = Number(v.N);
		else if (v.BOOL !== undefined) out[k] = v.BOOL;
		else if (v.SS !== undefined) out[k] = v.SS;
		else if (v.L !== undefined)
			out[k] = v.L.map((x: any) =>
				(x.S ?? x.N ?? x.BOOL ?? x.SS ?? x.M)
					? attributeMapToObject(x.M)
					: null,
			);
		else if (v.M !== undefined) out[k] = attributeMapToObject(v.M);
	});
	return out;
};

// TODO:delete comment - example schema usage
export const exampleItemSchema = z.object({
	pk: z.string(),
	sk: z.string(),
	value: z.string(),
});

// TODO:delete comment - example invocation
export const exampleUsage = async () => {
	const items = [
		{ pk: 'A#1', sk: 'META', value: 'v1' },
		{ pk: 'A#2', sk: 'META', value: 'v2' },
	];
	await batchPutItems('DEV', 'YourTableName', items, exampleItemSchema);
};
