import dayjs from 'dayjs';
import { logger } from '@modules/logger/logger';
import { queryZuora } from '../src/queryZuora';

describe('queryZuora', () => {
	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	const submitQuery = jest.fn(() => Promise.resolve({ id: 'job1' }));

	it('defaults to today in London, querying 14 days ahead', async () => {
		// 23:30 UTC in summer is already the next day in London
		const now = dayjs('2026-06-30T23:30:00Z');

		await expect(queryZuora({}, now, { submitQuery })).resolves.toEqual({
			jobId: 'job1',
			billingDate: '2026-07-15',
		});
		expect(submitQuery).toHaveBeenCalledWith(
			'email-reminders-2026-07-15',
			expect.stringContaining("ChargedThroughDate = '2026-07-15'"),
		);
	});

	it('uses the date it is given', async () => {
		await expect(
			queryZuora({ date: '2026-11-27' }, dayjs(), { submitQuery }),
		).resolves.toEqual({ jobId: 'job1', billingDate: '2026-12-11' });
	});
});
