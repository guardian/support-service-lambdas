/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { logger } from '@modules/routing/logger';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { isActiveEndpoint } from '../src/isActiveEndpoint';
import { responseSchema } from '../src/schemas';

const stage = 'CODE';

test('returns isActive true for a valid Observer subscription with matching postcode', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);

	const result = await isActiveEndpoint(
		zuoraClient,
		productCatalog,
		zuoraCatalog,
		{
			subscriptionId: 'A-S01098933',
			postCode: 'N1 9GU',
		},
	);

	expect(result.statusCode).toEqual(200);
	const body = responseSchema.parse(JSON.parse(result.body));
	logger.log('body', body);
	expect(body.isActive).toEqual(true);
	if (body.isActive) {
		expect(body.renews).toBeDefined();
	}
});

test('returns isActive false for a invalid Observer subscription', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);

	const result = await isActiveEndpoint(
		zuoraClient,
		productCatalog,
		zuoraCatalog,
		{
			subscriptionId: 'Invalid-Subscription-Id',
			postCode: 'N1 9GU',
		},
	);

	expect(result.statusCode).toEqual(200);
	const body = responseSchema.parse(JSON.parse(result.body));
	logger.log('body', body);
	expect(body.isActive).toEqual(false);
});
