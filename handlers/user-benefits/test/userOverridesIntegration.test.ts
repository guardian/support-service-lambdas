/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */

import { getUserOverrides } from '../src/userOverrides';

test('Can load userBenefits overrides from Parameter Store', async () => {
	const userBenefitsOverrides = await getUserOverrides('CODE');
	expect(userBenefitsOverrides.userOverrides.length).toEqual(1);
});
