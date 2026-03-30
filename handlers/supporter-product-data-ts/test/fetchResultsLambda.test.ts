import { fetchResults } from '../src/lambdas/fetchResultsLambda';
import type { BatchQueryResponse } from '../src/model/zuora';

type UploadToS3 = (
	stage: 'CODE' | 'PROD',
	filename: string,
	body: Uint8Array,
	length: number,
) => Promise<void>;

const makeGetResults =
	(response: BatchQueryResponse) => (): Promise<BatchQueryResponse> =>
		Promise.resolve(response);

const makeGetResultFileResponse =
	(body: string | null, contentLength: string) => (): Promise<Response> =>
		Promise.resolve(
			new Response(body, {
				status: 200,
				headers: { 'content-length': contentLength },
			}),
		);

const noopAsync = (): Promise<void> => Promise.resolve();

describe('fetchResults', () => {
	beforeEach(() => {
		process.env.STAGE = 'CODE';
	});

	test('returns AddSupporterRatePlanItemToQueueState and uploads file', async () => {
		const uploadToS3 = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, Parameters<UploadToS3>>;
		const putLastSuccessfulQueryTime = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, [string]>;

		const state = await fetchResults(
			{
				jobId: 'job-123',
				attemptedQueryTime: '2026-03-09T10:30:00.000Z',
			},
			{
				getResults: makeGetResults({
					id: 'job-123',
					status: 'completed',
					batches: [
						{
							name: 'batch-1',
							fileId: 'file-abc',
							recordCount: 3,
							full: false,
						},
					],
				}),
				getResultFileResponse: makeGetResultFileResponse('csv-data', '8'),
				uploadToS3,
				putLastSuccessfulQueryTime,
			},
		);

		expect(state).toEqual({
			filename: 'select-active-rate-plans-2026-03-09T10:30:00.000.csv',
			recordCount: 3,
			processedCount: 0,
			attemptedQueryTime: '2026-03-09T10:30:00.000Z',
		});

		expect(uploadToS3).toHaveBeenCalledTimes(1);
		expect(uploadToS3.mock.calls[0]?.[0]).toBe('CODE');
		expect(uploadToS3.mock.calls[0]?.[1]).toBe(
			'select-active-rate-plans-2026-03-09T10:30:00.000.csv',
		);
		expect(putLastSuccessfulQueryTime).not.toHaveBeenCalled();
	});

	test('updates lastSuccessfulQueryTime when no records are returned', async () => {
		const putLastSuccessfulQueryTime = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, [string]>;

		await fetchResults(
			{
				jobId: 'job-456',
				attemptedQueryTime: '2026-03-09T11:00:00.000Z',
			},
			{
				getResults: makeGetResults({
					id: 'job-456',
					status: 'completed',
					batches: [
						{
							name: 'batch-1',
							fileId: 'file-xyz',
							recordCount: 0,
							full: false,
						},
					],
				}),
				getResultFileResponse: makeGetResultFileResponse('csv-data', '8'),
				uploadToS3: noopAsync as never,
				putLastSuccessfulQueryTime,
			},
		);

		expect(putLastSuccessfulQueryTime).toHaveBeenCalledWith(
			'2026-03-09T11:00:00.000Z',
		);
	});

	test('throws when Zuora job is not completed', async () => {
		await expect(
			fetchResults(
				{
					jobId: 'job-789',
					attemptedQueryTime: '2026-03-09T11:00:00.000Z',
				},
				{
					getResults: makeGetResults({
						id: 'job-789',
						status: 'executing',
						batches: [],
					}),
					getResultFileResponse: makeGetResultFileResponse(null, '1'),
					uploadToS3: noopAsync as never,
					putLastSuccessfulQueryTime: noopAsync as never,
				},
			),
		).rejects.toThrow('Job with id job-789 is still in status executing');
	});
});
