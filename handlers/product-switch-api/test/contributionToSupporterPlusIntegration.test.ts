/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { switchToSupporterPlus } from '../src/contributionToSupporterPlus';

const testData = [['A00500556', 'A-S00504165']] as const;

describe('product-switching behaviour', () => {
	it('can preview a recurring contribution switch', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const accountData = testData[0];
		const result = await switchToSupporterPlus(
			zuoraClient,
			productCatalog,
			accountData[0],
			accountData[1],
			true,
		);
		expect(result.success).toBe(true);
	});
	it(
		'can switch a recurring contribution',
		async () => {
			const zuoraClient = await ZuoraClient.create('CODE');
			const productCatalog = await getProductCatalogFromApi('CODE');
			const accountData = testData[0];
			const result = await switchToSupporterPlus(
				zuoraClient,
				productCatalog,
				accountData[0],
				accountData[1],
				false,
			);
			expect(result.success).toBe(true);
		},
		1000 * 60,
	);
});
