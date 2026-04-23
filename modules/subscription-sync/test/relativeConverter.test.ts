import { logger } from '@modules/routing/logger';
import dayjs from 'dayjs';
import { RelativeConverter } from '../src/relativeConverter';
import { allTests } from './fixtures/testDataForTimelineParser';

test.each(
	Object.entries(allTests).filter(
		([, value]) => value(true).flattened !== undefined,
	),
)('check relative conversion works for %s', (_, testData) => {
	const sut = new RelativeConverter(dayjs('2026-03-11'));
	const actual = sut.toRelativeDates(testData(true).flattened!);
	logger.log(actual);
	expect(actual).toStrictEqual(testData(true).withRelativeDates);
});
