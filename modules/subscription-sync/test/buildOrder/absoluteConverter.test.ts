import { logger } from '@modules/routing/logger';
import dayjs from 'dayjs';
import { AbsoluteConverter } from '../../src/buildOrder/absoluteConverter';
import { allTests } from '../fixtures/testDataForTimelineParser';

test.each(
	Object.entries(allTests).filter(
		([, value]) => value(false).flattened !== undefined,
	),
)('check relative conversion works for %s', (_, testData) => {
	const sut = new AbsoluteConverter(dayjs('2026-03-12'));
	const actual = sut.toAbsoluteDates(testData(false).withRelativeDates);
	logger.log(actual);
	expect(actual).toStrictEqual(testData(false).flattened);
});
