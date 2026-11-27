import { logger } from '@modules/logger/logger';
import type { BatchQueryJob } from '@modules/zuora/batchQuery';
import {
	fetchResults,
	parseSubscriptions,
	QueryNotCompleteError,
} from '../src/fetchResults';

describe('parseSubscriptions', () => {
	it('returns one item per subscription', () => {
		const csv = [
			'Subscription.Name,Account.AccountNumber',
			'A-S00000001,A00000001',
			'A-S00000002,A00000002',
			'A-S00000001,A00000001',
			'',
		].join('\r\n');

		expect(parseSubscriptions(csv)).toEqual([
			{ subscriptionNumber: 'A-S00000001', accountNumber: 'A00000001' },
			{ subscriptionNumber: 'A-S00000002', accountNumber: 'A00000002' },
		]);
	});

	it('fails on unexpected columns', () => {
		expect(() => parseSubscriptions('Name,AccountNumber\nA-S1,A1')).toThrow(
			'unexpected query result columns',
		);
	});
});

describe('fetchResults', () => {
	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	const services = (job: Partial<BatchQueryJob>) => ({
		getJob: () =>
			Promise.resolve({ id: 'job1', batches: [], ...job } as BatchQueryJob),
		getFile: () =>
			Promise.resolve(
				'Subscription.Name,Account.AccountNumber\nA-S00000001,A00000001\nA-S00000001,A00000001',
			),
		putFile: jest.fn(() => Promise.resolve()),
	});

	const input = { jobId: 'job1', billingDate: '2026-12-11' };

	it('writes the subscriptions to S3 once the query completes', async () => {
		const deps = services({
			status: 'completed',
			batches: [{ name: 'q', fileId: 'file1', recordCount: 2 }],
		});

		await expect(fetchResults(input, deps)).resolves.toEqual({
			billingDate: '2026-12-11',
			key: '2026-12-11/job1.json',
			count: 1,
		});
		expect(deps.putFile).toHaveBeenCalledWith(
			'2026-12-11/job1.json',
			JSON.stringify([
				{ subscriptionNumber: 'A-S00000001', accountNumber: 'A00000001' },
			]),
		);
	});

	it('throws a retryable error while the query is running', async () => {
		await expect(
			fetchResults(input, services({ status: 'executing' })),
		).rejects.toThrow(QueryNotCompleteError);
	});

	it('throws a non-retryable error when the query fails', async () => {
		const result = fetchResults(input, services({ status: 'error' }));
		await expect(result).rejects.toThrow('query job1 failed');
		await expect(result).rejects.not.toThrow(QueryNotCompleteError);
	});
});
