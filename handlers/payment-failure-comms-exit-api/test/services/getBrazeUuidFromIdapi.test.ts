import { getUserByIdentityId } from '@modules/identity/idapi';
import { logger } from '@modules/logger/logger';
import { getIdentityClient } from '../../src/helpers/getIdentityClient';
import { getBrazeUuidFromIdapi } from '../../src/services/getBrazeUuidFromIdapi';

jest.mock('@modules/identity/idapi', () => ({
	getUserByIdentityId: jest.fn(),
}));

jest.mock('../../src/helpers/getIdentityClient', () => ({
	getIdentityClient: jest.fn(),
}));

describe('getBrazeUuidFromIdapi', () => {
	const identityClient = {};
	const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(getIdentityClient).mockResolvedValue(identityClient as never);
	});

	it('gets and trims the Braze UUID for an Identity ID', async () => {
		jest.mocked(getUserByIdentityId).mockResolvedValue({
			privateFields: { brazeUuid: ' braze-uuid ' },
		} as never);

		await expect(getBrazeUuidFromIdapi('200000001')).resolves.toBe(
			'braze-uuid',
		);

		expect(getUserByIdentityId).toHaveBeenCalledWith(
			identityClient,
			'200000001',
		);
	});

	it.each([
		undefined,
		{ privateFields: undefined },
		{ privateFields: { brazeUuid: '   ' } },
	])(
		'returns undefined when IDAPI does not provide a usable Braze UUID',
		async (user) => {
			jest.mocked(getUserByIdentityId).mockResolvedValue(user as never);

			await expect(getBrazeUuidFromIdapi('200000001')).resolves.toBeUndefined();

			expect(logSpy).toHaveBeenCalledWith(
				'No Braze UUID found for the supplied Identity ID',
			);
		},
	);
});
