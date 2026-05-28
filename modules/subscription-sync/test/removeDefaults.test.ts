import { removeDefaults } from '../src/removeDefaults';
import { allTests } from './fixtures/testDataForTimelineParser';

test.each(
	Object.entries(allTests).filter(
		([, value]) => value(true).withoutDefaults !== undefined,
	),
)(
	'removeDefaults removes values that are in the defaults objects as expected for %s',
	(_, testData) => {
		const actual = removeDefaults(testData(true).withRelativeDates);
		expect(actual).toStrictEqual(testData(true).withoutDefaults);
	},
);
