import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';

test('Dynamo Integration', async () => {
	const supporterData = await getSupporterProductData('CODE', '110001137');
	expect(supporterData?.length).toEqual(4);
});
