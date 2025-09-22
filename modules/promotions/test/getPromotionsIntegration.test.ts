/**
 * @group integration
 */

import { getPromotions } from '../src/getPromotions';
import { getIfDefined } from '@modules/nullAndUndefined';
import * as util from 'node:util';

describe('getPromotions functions', () => {
	test('we can return all promotions for a given stage', async () => {
		const promotions = getIfDefined(
			await getPromotions('CODE'),
			'No promotions found',
		);
		console.log(util.inspect(promotions, { depth: null, colors: true }));
		expect(promotions.length).toBeGreaterThan(0);
	});
});
