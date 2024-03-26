/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { doSwitch, preview } from '../src/contributionToSupporterPlus';
import { getCatalogIds } from '../src/helpers';

describe('product-switching behaviour', () => {
	it('can preview an annual recurring contribution switch', async () => {
		const accountNumber = 'A00701136';
		const subscriptionNumber = 'A-S00695309';
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const catalogIds = getCatalogIds(productCatalog, 'Annual');

		const result = await preview(
			zuoraClient,
			accountNumber,
			subscriptionNumber,
			catalogIds,
		);
		expect(result.supporterPlusPurchaseAmount).toBe(120);
	});
	it(
		'can switch an annual recurring contribution',
		async () => {
			const accountNumber = 'A00432390';
			const subscriptionNumber = 'A-S00439620';
			const zuoraClient = await ZuoraClient.create('CODE');
			const productCatalog = await getProductCatalogFromApi('CODE');

			const result = await doSwitch(
				zuoraClient,
				accountNumber,
				subscriptionNumber,
				productCatalog.Contribution.ratePlans.Annual.id,
				productCatalog.SupporterPlus.ratePlans.Annual.id,
			);
			expect(result.success).toBe(true);
		},
		1000 * 60,
	);
});
