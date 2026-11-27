import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';

// AQuA (aggregate query) API: https://developer.zuora.com/v1-api-reference/older-api/tag/AQuA/

const batchQueryJobSchema = z.object({
	id: z.string(),
	status: z.enum([
		'submitted',
		'pending',
		'executing',
		'completed',
		'aborted',
		'error',
		'cancelled',
	]),
	batches: z.array(
		z.object({
			name: z.string(),
			fileId: z.string().optional(),
			recordCount: z.number().optional(),
			message: z.string().optional(),
		}),
	),
});

export type BatchQueryJob = z.infer<typeof batchQueryJobSchema>;

/**
 * Submits a stateless ZOQL export query, returning a job whose results are fetched once it completes
 * (see getBatchQueryJob and getBatchQueryFile).
 */
export async function submitZoqlExport(
	zuoraClient: ZuoraClient,
	name: string,
	query: string,
): Promise<BatchQueryJob> {
	const request = {
		name,
		queries: [{ name, query, type: 'zoqlexport' }],
		format: 'csv',
		version: '1.1',
		encrypted: 'none',
		useQueryLabels: 'true',
		dateTimeUtc: 'true',
	};
	return await zuoraClient.post(
		'/v1/batch-query/',
		JSON.stringify(request),
		batchQueryJobSchema,
	);
}

export async function getBatchQueryJob(
	zuoraClient: ZuoraClient,
	jobId: string,
): Promise<BatchQueryJob> {
	return await zuoraClient.get(
		`/v1/batch-query/jobs/${jobId}`,
		batchQueryJobSchema,
	);
}

export async function getBatchQueryFile(
	zuoraClient: ZuoraClient,
	fileId: string,
): Promise<string> {
	const stream = await zuoraClient.getStream(`/v1/batch-query/file/${fileId}`);
	return await new Response(stream).text();
}
