import { logger } from '@modules/routing/logger';
import { addDefaults } from '../../src/buildOrder/addDefaults';
import { allTests } from '../fixtures/testDataForTimelineParser';

test.each(
	Object.entries(allTests).filter(
		([, value]) => value(false).withoutDefaults !== undefined,
	),
)('check adding defaults back works for %s', (_, testData) => {
	const actual = addDefaults(testData(false).withoutDefaults!);
	logger.log(actual);
	expect(actual).toStrictEqual(testData(false).withRelativeDates);
});
