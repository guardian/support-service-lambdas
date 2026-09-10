/**
 * @group integration
 */

import * as util from 'node:util';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	getPromotions,
	getPromotionsByCodes,
} from '@modules/promotions/v2/getPromotions';

describe('getPromotions functions', () => {
	test('we can return all v2 promotions for a given stage', async () => {
		const promotions = getIfDefined(
			await getPromotions('CODE'),
			'No promotions found',
		);
		console.log(util.inspect(promotions, { depth: null, colors: true }));
		expect(promotions.length).toBeGreaterThan(0);
	});

	test('we can fetch specific v2 promotions by promo code for a given stage', async () => {
		const allPromotions = getIfDefined(
			await getPromotions('CODE'),
			'No promotions found',
		);
		const [somePromotion] = allPromotions;
		if (somePromotion === undefined) {
			throw new Error('No promotions found to test with');
		}

		const promotions = await getPromotionsByCodes(
			[somePromotion.promoCode, 'DOES_NOT_EXIST'],
			'CODE',
		);
		console.log(util.inspect(promotions, { depth: null, colors: true }));
		expect(promotions).toEqual([somePromotion]);
	});
});
