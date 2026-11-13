import { loadConfig } from '@modules/aws/appConfig';
import {
	configSchema,
	getAppConfig,
	MPARTICLE_CONFIG_APP,
} from '../src/config';

jest.mock('@modules/aws/appConfig', () => ({
	loadConfig: jest.fn(),
}));

const loadConfigMock = jest.mocked(loadConfig);

describe('mParticle config', () => {
	beforeEach(() => {
		loadConfigMock.mockReset();
		loadConfigMock.mockResolvedValue({
			mparticle: {
				pod: 'eu1',
				key: 'publisher-api-key',
				secret: 'publisher-api-secret',
			},
		});
	});

	it('requires the shared mParticle credentials and pod', () => {
		expect(() =>
			configSchema.parse({
				mparticle: {
					key: 'publisher-api-key',
					secret: 'publisher-api-secret',
				},
			}),
		).toThrow();
	});

	it('loads the shared publisher configuration from the fixed CODE SSM path', async () => {
		const config = await getAppConfig();

		expect(config.mparticle).toEqual({
			pod: 'eu1',
			key: 'publisher-api-key',
			secret: 'publisher-api-secret',
		});
		expect(loadConfigMock).toHaveBeenCalledWith(
			'CODE',
			'support',
			MPARTICLE_CONFIG_APP,
			configSchema,
		);
	});
});
