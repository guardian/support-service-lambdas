/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 */
import type { ProductSwitchRequestBody } from '../src/requestSchema';
import { productSwitchRequestSchema } from '../src/requestSchema';

test('request body serialisation', () => {
	const result: ProductSwitchRequestBody = productSwitchRequestSchema.parse({
		price: 10,
		preview: false,
	});
	expect(result.price).toEqual(10);
});
