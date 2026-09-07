/**
 * @group integration
 */

import * as util from 'node:util';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getPromotions } from '@modules/promotions/v2/getPromotions';

describe('getPromotions functions', () => {
	test('we can return all v2 promotions for a given stage', async () => {
		const promotions = getIfDefined(
			await getPromotions('CODE'),
			'No promotions found',
		);
		console.log(util.inspect(promotions, { depth: null, colors: true }));
		expect(promotions.length).toBeGreaterThan(0);
	});
});
