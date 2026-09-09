import { IdentityClient } from '@modules/identity/identityClient';
import { stageFromEnvironment } from '@modules/stage';
import { getIdentityClient } from '../../src/helpers/getIdentityClient';

jest.mock('@modules/identity/identityClient', () => ({
	IdentityClient: {
		create: jest.fn(),
	},
}));

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(),
}));

const createIdentityClient = jest.spyOn(IdentityClient, 'create');

describe('getIdentityClient', () => {
	it('creates and caches an Identity client scoped to the current stage', async () => {
		const client = {} as IdentityClient;
		jest.mocked(stageFromEnvironment).mockReturnValue('CODE');
		createIdentityClient.mockResolvedValue(client);

		await expect(getIdentityClient()).resolves.toBe(client);
		await expect(getIdentityClient()).resolves.toBe(client);

		expect(createIdentityClient).toHaveBeenCalledWith(
			'CODE',
			'/CODE/support/payment-failure-comms-exit-api/identity-client-access-token',
		);
		expect(createIdentityClient).toHaveBeenCalledTimes(1);
	});
});
