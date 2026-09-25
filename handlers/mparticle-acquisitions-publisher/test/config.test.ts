import { loadConfig } from '@modules/aws/appConfig';
import { getSSMParam } from '@modules/aws/ssm';
import { configSchema, getAppConfig } from '../src/config';

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
			},
		});
		getSSMParamMock.mockImplementation((name) => {
			if (name.endsWith('/key')) {
				return Promise.resolve('shared-api-key');
			}
			if (name.endsWith('/secret')) {
				return Promise.resolve('shared-api-secret');
			}
			if (name.endsWith('/pod')) {
				return Promise.resolve('eu1');
			}
			throw new Error(`Unexpected SSM parameter: ${name}`);
		});
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('requires the shared Events API pod', () => {
		expect(() =>
			configSchema.parse({
				mparticle: {
					key: 'api-key',
					secret: 'api-secret',
					googleEnhancedConversionsConversionActionId: 'conversion-action',
				},
			}),
		).toThrow();
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
		expect(config.mparticle.pod).toBe('eu1');
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
		expect(getSSMParamMock).toHaveBeenCalledWith(
			'/CODE/support/mparticle-api/pod',
		);
	});
});
