import { appConfigSchema } from '../../src/schemas/appConfigSchema';

describe('appConfigSchema', () => {
	it('accepts the complete Braze configuration', () => {
		expect(
			appConfigSchema.parse({
				braze: {
					apiUrl: 'https://rest.fra-01.braze.eu',
					apiKey: 'braze-api-key',
					appId: 'braze-app-id',
				},
			}),
		).toEqual({
			braze: {
				apiUrl: 'https://rest.fra-01.braze.eu',
				apiKey: 'braze-api-key',
				appId: 'braze-app-id',
			},
		});
	});

	it('rejects incomplete or invalid Braze configuration', () => {
		expect(() =>
			appConfigSchema.parse({
				braze: { apiUrl: 'not-a-url', apiKey: '', appId: '' },
			}),
		).toThrow();
	});
});
