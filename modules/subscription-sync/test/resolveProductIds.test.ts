import { logger } from '@modules/routing/logger';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixtureCode from '../../zuora-catalog/test/fixtures/catalog-code.json';
import { ResolveProductIds } from '../src/resolveProductIds';
import { allTests } from './fixtures/testDataForTimelineParser';

const catalog = zuoraCatalogSchema.parse(zuoraCatalogFixtureCode);

test.each(
	Object.entries(allTests).filter(
		([, value]) =>
			value(true).withoutDefaults !== undefined &&
			value(true).withProductIds !== undefined,
	),
)('check product name lookup works for %s', (_, testData) => {
	const actual = new ResolveProductIds(catalog).resolveProductIds(
		testData(true).withoutDefaults!,
	);
	logger.log(actual);
	expect(actual).toStrictEqual(testData(true).withProductIds);
});
