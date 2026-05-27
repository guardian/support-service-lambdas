import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';
import type { BatchQueryRequest } from '../model/query';
import type { BatchQueryResponse } from '../model/zuora';

const batchQueryItemSchema = z.object({
	name: z.string(),
	fileId: z.string().optional(),
	recordCount: z.number(),
	full: z.boolean(),
});

const batchQueryResponseSchema = z.object({
	id: z.string(),
	status: z.union([
		z.literal('submitted'),
		z.literal('executing'),
		z.literal('completed'),
		z.literal('aborted'),
		z.literal('error'),
	]),
	batches: z.array(batchQueryItemSchema),
});

export class ZuoraQuerierService {
	constructor(private readonly zuoraClient: ZuoraClient) {}

	async getResults(jobId: string): Promise<BatchQueryResponse> {
		return await this.zuoraClient.get(
			`/v1/batch-query/jobs/${jobId}`,
			batchQueryResponseSchema,
		);
	}

	async getResultFileResponse(fileId: string): Promise<Response> {
		const auth = await this.zuoraClient.tokenProvider.getAuthorisation();
		const url = `${auth.baseUrl}/v1/batch-query/file/${fileId}`;
		console.info('Zuora API request', { method: 'GET', url });

		const response = await fetch(url, {
			method: 'GET',
			headers: auth.authHeaders,
		});

		console.info('Zuora API response', {
			method: 'GET',
			url,
			status: response.status,
			ok: response.ok,
			contentLength: response.headers.get('content-length'),
		});

		return response;
	}

	async postQuery(request: BatchQueryRequest): Promise<BatchQueryResponse> {
		return await this.zuoraClient.post(
			`/v1/batch-query/`,
			JSON.stringify(request),
			batchQueryResponseSchema,
		);
	}
}
