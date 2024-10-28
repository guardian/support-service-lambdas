/**
 * @group integration
 */

import { getSupporterProductData } from '../src/dynamo';

test('Dynamo Integration', async () => {
	const supporterData = await getSupporterProductData('110001137', 'CODE');
	expect(supporterData?.length).toEqual(4);
});
