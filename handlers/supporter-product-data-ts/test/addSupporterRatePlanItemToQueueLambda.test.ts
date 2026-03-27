import { addToQueue } from '../src/lambdas/addSupporterRatePlanItemToQueueLambda';
import type { SupporterRatePlanItem } from '../src/model/supporterRatePlanItem';
import { parseCsvStreamWithHeader } from '../src/services/csvService';

const csvHeader =
	'Subscription.Name,Account.IdentityId__c,ProductRatePlan.Id,ProductRatePlan.Name,Subscription.TermEndDate,Subscription.ContractEffectiveDate';

async function* linesFromString(text: string): AsyncGenerator<string> {
	for (const line of text.split('\n').filter((l) => l.trim().length > 0)) {
		yield await Promise.resolve(line);
	}
}

const streamCsvRows = (csv: string): AsyncGenerator<Record<string, string>> => {
	return parseCsvStreamWithHeader(linesFromString(csv));
};

const noopAsync = (): Promise<void> => Promise.resolve();

type IndexedItem = [SupporterRatePlanItem, number];

describe('addSupporterRatePlanItemToQueueLambda', () => {
	test('sends records in batches and updates processedCount', async () => {
		const sendBatch = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, [IndexedItem[]]>;
		const putLastSuccessfulQueryTime = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, [string]>;

		const csv = [
			csvHeader,
			'sub-1,id-1,prp-1,plan-1,2026-03-01,2026-02-01',
			'sub-2,id-2,prp-2,plan-2,2026-03-02,2026-02-02',
		].join('\n');

		const result = await addToQueue(
			{
				filename: 'file.csv',
				recordCount: 2,
				processedCount: 0,
				attemptedQueryTime: '2026-03-01T00:00:00.000Z',
			},
			() => 120000,
			{
				streamCsvRows: () => streamCsvRows(csv),
				sendBatch,
				triggerCsvReadAlarm: noopAsync,
				triggerSqsWriteAlarm: noopAsync,
				putLastSuccessfulQueryTime,
			},
		);

		expect(sendBatch).toHaveBeenCalledTimes(1);
		expect(result.processedCount).toBe(2);
		expect(putLastSuccessfulQueryTime).toHaveBeenCalledWith(
			'2026-03-01T00:00:00.000Z',
		);
	});

	test('throws and triggers alarm for empty CSV', async () => {
		const triggerCsvReadAlarm = jest.fn((): Promise<void> => Promise.resolve());

		await expect(
			addToQueue(
				{
					filename: 'file.csv',
					recordCount: 1,
					processedCount: 0,
					attemptedQueryTime: '2026-03-01T00:00:00.000Z',
				},
				() => 120000,
				{
					streamCsvRows: () => streamCsvRows(''),
					sendBatch: noopAsync as never,
					triggerCsvReadAlarm,
					triggerSqsWriteAlarm: noopAsync,
					putLastSuccessfulQueryTime: noopAsync as never,
				},
			),
		).rejects.toThrow('was empty');

		expect(triggerCsvReadAlarm).toHaveBeenCalledTimes(1);
	});

	test('skips already-processed rows and resumes from processedCount', async () => {
		const sendBatch = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, [IndexedItem[]]>;

		const csv = [
			csvHeader,
			'sub-1,id-1,prp-1,plan-1,2026-03-01,2026-02-01',
			'sub-2,id-2,prp-2,plan-2,2026-03-02,2026-02-02',
			'sub-3,id-3,prp-3,plan-3,2026-03-03,2026-02-03',
		].join('\n');

		const result = await addToQueue(
			{
				filename: 'file.csv',
				recordCount: 3,
				processedCount: 1, // first row already done
				attemptedQueryTime: '2026-03-01T00:00:00.000Z',
			},
			() => 120000,
			{
				streamCsvRows: () => streamCsvRows(csv),
				sendBatch,
				triggerCsvReadAlarm: noopAsync,
				triggerSqsWriteAlarm: noopAsync,
				putLastSuccessfulQueryTime: noopAsync as never,
			},
		);

		// Only rows 1 and 2 (indices 1 and 2) should be sent
		const sentItems = sendBatch.mock.calls.flatMap((call) => call[0]);
		expect(sentItems).toHaveLength(2);
		expect(sentItems[0]?.[1]).toBe(1); // index 1
		expect(sentItems[1]?.[1]).toBe(2); // index 2
		expect(result.processedCount).toBe(3);
	});

	test('stops processing and returns early when time is running low', async () => {
		const sendBatch = jest.fn(
			(): Promise<void> => Promise.resolve(),
		) as unknown as jest.Mock<Promise<void>, [IndexedItem[]]>;
		let callCount = 0;

		// Return plenty of time for the first batch, then run low
		const getRemainingTime = () => {
			callCount += 1;
			return callCount <= 2 ? 120000 : 100; // low after 2 checks
		};

		const csv = [
			csvHeader,
			'sub-1,id-1,prp-1,plan-1,2026-03-01,2026-02-01',
			'sub-2,id-2,prp-2,plan-2,2026-03-02,2026-02-02',
			'sub-3,id-3,prp-3,plan-3,2026-03-03,2026-02-03',
			'sub-4,id-4,prp-4,plan-4,2026-03-04,2026-02-04',
			'sub-5,id-5,prp-5,plan-5,2026-03-05,2026-02-05',
			'sub-6,id-6,prp-6,plan-6,2026-03-06,2026-02-06',
		].join('\n');

		const result = await addToQueue(
			{
				filename: 'file.csv',
				recordCount: 6,
				processedCount: 0,
				attemptedQueryTime: '2026-03-01T00:00:00.000Z',
			},
			getRemainingTime,
			{
				streamCsvRows: () => streamCsvRows(csv),
				sendBatch,
				triggerCsvReadAlarm: noopAsync,
				triggerSqsWriteAlarm: noopAsync,
				putLastSuccessfulQueryTime: noopAsync as never,
			},
		);

		// Should not have processed all 6 rows
		expect(result.processedCount).toBeLessThan(6);
	});
});
