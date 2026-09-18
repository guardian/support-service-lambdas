import { configSchema, DEFAULT_MPARTICLE_ENDPOINT } from '../src/config';

describe('mParticle config', () => {
	it('defaults the Events API endpoint to EU1', () => {
		expect(
			configSchema.parse({
				mparticle: {
					apiKey: 'api-key',
					apiSecret: 'api-secret',
					googleEnhancedConversionsConversionActionId: 'conversion-action',
				},
			}),
		).toEqual({
			mparticle: {
				apiKey: 'api-key',
				apiSecret: 'api-secret',
				googleEnhancedConversionsConversionActionId: 'conversion-action',
				endpoint: DEFAULT_MPARTICLE_ENDPOINT,
			},
		});
	});

	it('rejects missing credentials', () => {
		expect(() =>
			configSchema.parse({ mparticle: { apiKey: 'api-key' } }),
		).toThrow();
	});
});
