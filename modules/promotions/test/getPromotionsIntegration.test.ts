/**
 * @group integration
 */

import { getPromotionByCode, getPromotions } from '../src/getPromotions';
import { getIfDefined } from '@modules/nullAndUndefined';
import * as util from 'node:util';

describe('getPromotions functions', () => {
	test('we can return all promotions for a given stage', async () => {
		const promotions = getIfDefined(
			await getPromotions('PROD'),
			'No promotions found',
		);
		console.log(util.inspect(promotions, { depth: null, colors: true }));
		expect(promotions.length).toBeGreaterThan(0);
	});

	test('we can find a promotion by code', async () => {
		const promotions = getIfDefined(
			await getPromotions('CODE'),
			'No promotions found',
		);
		const promotion = await getPromotionByCode(promotions, '50OFF3');
		expect(promotion).toBeDefined();
	});
	test('find all promotions with landing page', async () => {
		const promotions = getIfDefined(
			await getPromotions('CODE'),
			'No promotions found',
		);
		const promotionsWithLandingPage = promotions.filter(
			(promo) => promo.landingPage !== undefined,
		);
		expect(promotionsWithLandingPage.length).toBeGreaterThan(0);
	});
});
