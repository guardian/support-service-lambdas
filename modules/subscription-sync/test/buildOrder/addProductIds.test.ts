import { logger } from '@modules/routing/logger';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixtureCode from '../../../zuora-catalog/test/fixtures/catalog-code.json';
import { AddProductIds } from '../../src/buildOrder/addProductIds';
import { allTests } from '../fixtures/testDataForTimelineParser';

const catalog = zuoraCatalogSchema.parse(zuoraCatalogFixtureCode);

test.each(
	Object.entries(allTests).filter(
		([, value]) =>
			value(false).withProductIds !== undefined &&
			value(false).withoutDefaults !== undefined,
	),
)('check product ID lookup works for %s', (_, testData) => {
	const actual = new AddProductIds(catalog).addProductIds(
		testData(false).withProductIds!,
	);
	logger.log(actual);
	expect(actual).toStrictEqual(testData(false).withoutDefaults);
});
