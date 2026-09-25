import { loadConfig } from '@modules/aws/appConfig';
import { configSchema, getAppConfig } from '../src/config';

jest.mock('@modules/aws/appConfig', () => ({
	loadConfig: jest.fn(),
}));

const loadConfigMock = jest.mocked(loadConfig);
const originalEnv = { ...process.env };

describe('mParticle config', () => {
	beforeEach(() => {
		loadConfigMock.mockReset();
		process.env = {
			...process.env,
			STAGE: 'CODE',
			STACK: 'support',
			APP: 'mparticle-acquisitions-publisher',
		};
		loadConfigMock.mockResolvedValue({
			mparticle: {
				googleEnhancedConversionsConversionActionId: 'conversion-action',
				pod: 'eu1',
				key: 'publisher-api-key',
				secret: 'publisher-api-secret',
			},
		});
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('requires the publisher mParticle credentials and pod', () => {
		expect(() =>
			configSchema.parse({
				mparticle: {
					googleEnhancedConversionsConversionActionId: 'conversion-action',
				},
			}),
		).toThrow();
	});

	it('loads the publisher configuration from its own SSM path', async () => {
		const config = await getAppConfig();

		expect(config.mparticle.key).toBe('publisher-api-key');
		expect(config.mparticle.secret).toBe('publisher-api-secret');
		expect(config.mparticle.pod).toBe('eu1');
		expect(loadConfigMock).toHaveBeenCalledWith(
			'CODE',
			'support',
			'mparticle-acquisitions-publisher',
			configSchema,
		);
	});
});
