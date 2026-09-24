import { getSSMParam } from '@modules/aws/ssm';
import {
	getAppConfig,
	MPARTICLE_API_KEY_PARAMETER,
	MPARTICLE_API_SECRET_PARAMETER,
} from '../src/config';

jest.mock('@modules/aws/ssm', () => ({
	getSSMParam: jest.fn(),
}));

const getSSMParamMock = jest.mocked(getSSMParam);

describe('getAppConfig', () => {
	it('loads the CODE mParticle credentials from the existing parameters', async () => {
		getSSMParamMock.mockImplementation(async (name) => {
			if (name === MPARTICLE_API_KEY_PARAMETER) {
				return 'api-key';
			}
			if (name === MPARTICLE_API_SECRET_PARAMETER) {
				return 'api-secret';
			}
			throw new Error(`Unexpected parameter: ${name}`);
		});

		await expect(getAppConfig()).resolves.toEqual({
			apiKey: 'api-key',
			apiSecret: 'api-secret',
		});

		expect(getSSMParamMock).toHaveBeenNthCalledWith(
			1,
			'/CODE/support/mparticle-api/inputPlatform/key',
		);
		expect(getSSMParamMock).toHaveBeenNthCalledWith(
			2,
			'/CODE/support/mparticle-api/inputPlatform/secret',
		);
	});
});
