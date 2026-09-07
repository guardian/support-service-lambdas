import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getInvitationEndpoint } from '../src/getInvitationEndpoint';
import type { InvitationRepository } from '../src/invitationRepository';

const subscriptionName = 'A-S00974337';
const secondaryIdentityId = 'secondary-id';
const primaryIdentityId = 'primary-id';
const invitationCode = 'RpwR62kMnAxe';

const makeSecondaryUser = (
	overrides: Partial<SecondaryUserRecord> = {},
): SecondaryUserRecord => ({
	subscriptionName,
	secondaryIdentityId,
	primaryIdentityId,
	acceptedDate: '2026-06-12T00:00:00.000Z',
	expiryDate: 1781218800,
	invitationCode,
	...overrides,
});

const makeInvitationRepository = (): {
	repository: InvitationRepository;
	mockGet: jest.Mock;
} => {
	const mockGet = jest.fn().mockResolvedValue(undefined);
	const repository = {
		get: mockGet,
	} as unknown as InvitationRepository;
	return { repository, mockGet };
};

const makeSecondaryUserRepository = (
	secondaryUsers: SecondaryUserRecord[],
): {
	repository: SecondaryUserRepository;
	mockListByInvitationCode: jest.Mock;
} => {
	const mockListByInvitationCode = jest.fn().mockResolvedValue(secondaryUsers);
	const repository = {
		listByInvitationCode: mockListByInvitationCode,
	} as unknown as SecondaryUserRepository;
	return { repository, mockListByInvitationCode };
};

describe('getInvitationEndpoint', () => {
	it('returns 410 when the invitation has already been accepted', async () => {
		const { repository: invitationRepository, mockGet } =
			makeInvitationRepository();
		const { repository: secondaryUserRepository, mockListByInvitationCode } =
			makeSecondaryUserRepository([makeSecondaryUser()]);

		const result = await getInvitationEndpoint(
			invitationRepository,
			secondaryUserRepository,
			invitationCode,
		);

		expect(result.statusCode).toBe(410);
		expect(mockGet).toHaveBeenCalledWith(invitationCode);
		expect(mockListByInvitationCode).toHaveBeenCalledWith(invitationCode);
	});

	it('returns 404 when the invitation is not found and there is no matching secondary user record', async () => {
		const { repository: invitationRepository } = makeInvitationRepository();
		const { repository: secondaryUserRepository } = makeSecondaryUserRepository(
			[],
		);

		const result = await getInvitationEndpoint(
			invitationRepository,
			secondaryUserRepository,
			invitationCode,
		);

		expect(result.statusCode).toBe(404);
	});
});
