import { promoItemSchema } from '../../src/v2/schema';

const promo = {
	promoCode: 'REGIONAL_OFFER',
	name: 'Regional offer',
	campaignCode: 'campaign',
	startTimestamp: '2026-08-13T12:28:37.724Z',
};
const productRatePlanIds = ['monthly-plan'];

it('resolves stored groups and exact countries for existing API consumers', () => {
	const result = promoItemSchema.parse({
		...promo,
		appliesTo: {
			productRatePlanIds,
			countryGroups: ['ukm', 'ca'],
			countries: ['CA', 'FR'],
		},
	});

	expect(result.appliesTo).toEqual({
		productRatePlanIds,
		countries: ['CA', 'FR', 'GB'],
	});
});

it('reads a legacy list and rejects unknown group IDs', () => {
	const appliesTo = { productRatePlanIds, countries: ['AM'] };
	expect(promoItemSchema.parse({ ...promo, appliesTo }).appliesTo).toEqual(
		appliesTo,
	);
	expect(
		promoItemSchema.safeParse({
			...promo,
			appliesTo: { ...appliesTo, countryGroups: ['unknown'] },
		}).success,
	).toBe(false);
});
