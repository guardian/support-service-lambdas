import { flattenOrder } from '../src/flattenOrder';
import { allTests } from './fixtures/testDataForTimelineParser';

test.each(
	Object.entries(allTests).filter(
		([, value]) => value(true).flattened !== undefined,
	),
)('flattenOrder flattens relative events as expected for %s', (_, testData) => {
	const actual = flattenOrder(testData(true).parsed);
	expect(actual).toStrictEqual(testData(true).flattened);
});
