import { BrazeClient } from '../../src/clients/brazeClient';
import { getAppConfig } from '../../src/helpers/getAppConfig';
import { getBrazeClient } from '../../src/helpers/getBrazeClient';

jest.mock('../../src/clients/brazeClient', () => ({
	BrazeClient: jest.fn(),
}));

jest.mock('../../src/helpers/getAppConfig', () => ({
	getAppConfig: jest.fn(),
}));

const config = {
	braze: {
		apiUrl: 'https://rest.fra-01.braze.eu',
		apiKey: 'braze-api-key',
		appId: 'braze-app-id',
	},
};

describe('getBrazeClient', () => {
	it('creates and caches a configured Braze client', async () => {
		const client = { sendCustomEvent: jest.fn() };
		jest.mocked(getAppConfig).mockResolvedValue(config);
		jest.mocked(BrazeClient).mockImplementation(() => client as never);

		await expect(getBrazeClient()).resolves.toEqual({
			client,
			appId: 'braze-app-id',
		});
		await expect(getBrazeClient()).resolves.toEqual({
			client,
			appId: 'braze-app-id',
		});

		expect(getAppConfig).toHaveBeenCalledTimes(1);
		expect(BrazeClient).toHaveBeenCalledWith(
			'https://rest.fra-01.braze.eu',
			'braze-api-key',
		);
	});
});
