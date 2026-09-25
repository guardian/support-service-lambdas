import { loadConfig } from '@modules/aws/appConfig';
import { getSSMParam } from '@modules/aws/ssm';
import {
	configSchema,
	DEFAULT_MPARTICLE_POD,
	getAppConfig,
} from '../src/config';

jest.mock('@modules/aws/appConfig', () => ({
	loadConfig: jest.fn(),
}));

jest.mock('@modules/aws/ssm', () => ({
	getSSMParam: jest.fn(),
}));

const loadConfigMock = jest.mocked(loadConfig);
const getSSMParamMock = jest.mocked(getSSMParam);
const originalEnv = { ...process.env };

describe('mParticle config', () => {
	beforeEach(() => {
		loadConfigMock.mockReset();
		getSSMParamMock.mockReset();
		process.env = {
			...process.env,
			STAGE: 'CODE',
			STACK: 'support',
			APP: 'mparticle-acquisitions-publisher',
		};
		loadConfigMock.mockResolvedValue({
			mparticle: {
				googleEnhancedConversionsConversionActionId: 'conversion-action',
				pod: DEFAULT_MPARTICLE_POD,
			},
		});
		getSSMParamMock.mockImplementation((name) =>
			Promise.resolve(
				name.endsWith('/key') ? 'shared-api-key' : 'shared-api-secret',
			),
		);
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('defaults the Events API pod to EU1', () => {
		expect(
			configSchema.parse({
				mparticle: {
					key: 'api-key',
					secret: 'api-secret',
					googleEnhancedConversionsConversionActionId: 'conversion-action',
				},
			}),
		).toEqual({
			mparticle: {
				key: 'api-key',
				secret: 'api-secret',
				googleEnhancedConversionsConversionActionId: 'conversion-action',
				pod: DEFAULT_MPARTICLE_POD,
			},
		});
	});

	it('rejects missing credentials', () => {
		expect(() =>
			configSchema.parse({ mparticle: { key: 'api-key' } }),
		).toThrow();
	});

	it('loads credentials from the existing mParticle API parameters', async () => {
		const config = await getAppConfig();

		expect(config.mparticle.key).toBe('shared-api-key');
		expect(config.mparticle.secret).toBe('shared-api-secret');
		expect(loadConfigMock).toHaveBeenCalledWith(
			'CODE',
			'support',
			'mparticle-acquisitions-publisher',
			expect.anything(),
		);
		expect(getSSMParamMock).toHaveBeenCalledWith(
			'/CODE/support/mparticle-api/inputPlatform/key',
		);
		expect(getSSMParamMock).toHaveBeenCalledWith(
			'/CODE/support/mparticle-api/inputPlatform/secret',
		);
	});
});
