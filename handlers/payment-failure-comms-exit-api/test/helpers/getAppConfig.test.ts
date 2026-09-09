import { loadConfig } from '@modules/aws/appConfig';
import { getAppConfig } from '../../src/helpers/getAppConfig';
import { getEnvironmentVariable } from '../../src/helpers/getEnvironmentVariable';

jest.mock('@modules/aws/appConfig', () => ({
	loadConfig: jest.fn(),
}));

jest.mock('../../src/helpers/getEnvironmentVariable', () => ({
	getEnvironmentVariable: jest.fn(),
}));

const config = {
	braze: {
		apiUrl: 'https://rest.fra-01.braze.eu',
		apiKey: 'braze-api-key',
		appId: 'braze-app-id',
	},
};

describe('getAppConfig', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(getEnvironmentVariable).mockImplementation((name) => {
			const variables: Record<string, string> = {
				STAGE: 'CODE',
				STACK: 'support',
				APP: 'payment-failure-comms-exit-api',
			};
			return variables[name] ?? '';
		});
		jest.mocked(loadConfig).mockResolvedValue(config);
	});

	it('loads and validates configuration from the standard application path', async () => {
		await expect(getAppConfig()).resolves.toEqual(config);

		expect(loadConfig).toHaveBeenCalledWith(
			'CODE',
			'support',
			'payment-failure-comms-exit-api',
			expect.anything(),
		);
	});
});
