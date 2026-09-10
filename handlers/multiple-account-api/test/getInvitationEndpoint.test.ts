import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getInvitationEndpoint } from '../src/getInvitationEndpoint';
import type {
	InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';

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

const makeInvitation = (
	overrides: Partial<InvitationRecord> = {},
): InvitationRecord => ({
	subscriptionName,
	invitationCode,
	primaryIdentityId,
	primaryUserFirstName: 'Joe',
	primaryUserEmail: 'joe@example.com',
	secondaryUserEmail: 'secondary@example.com',
	secondaryIdentityId,
	invitedDate: '2026-06-12T00:00:00.000Z',
	expiryDate: 1781222400,
	...overrides,
});

const makeInvitationRepository = (
	invitation: InvitationRecord | undefined = undefined,
): {
	repository: InvitationRepository;
	mockGet: jest.Mock;
} => {
	const mockGet = jest.fn().mockResolvedValue(invitation);
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
	it('returns 410 when the invitation has already been soft-accepted (acceptedDate is set)', async () => {
		const { repository: invitationRepository, mockGet } =
			makeInvitationRepository(
				makeInvitation({ acceptedDate: '2026-06-12T00:00:00.000Z' }),
			);
		const { repository: secondaryUserRepository, mockListByInvitationCode } =
			makeSecondaryUserRepository([]);

		const result = await getInvitationEndpoint(
			invitationRepository,
			secondaryUserRepository,
			invitationCode,
		);

		expect(result.statusCode).toBe(410);
		expect(mockGet).toHaveBeenCalledWith(invitationCode);
		// The invitation itself already tells us it's accepted, so there's no
		// need for the fallback secondary user record lookup.
		expect(mockListByInvitationCode).not.toHaveBeenCalled();
	});

	it('returns 410 when the invitation record no longer exists (TTL-expired) but a secondary user record exists', async () => {
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

	it('returns 200 with the invitation when it exists and has not been accepted or cancelled', async () => {
		const invitation = makeInvitation();
		const { repository: invitationRepository } =
			makeInvitationRepository(invitation);
		const { repository: secondaryUserRepository, mockListByInvitationCode } =
			makeSecondaryUserRepository([]);

		const result = await getInvitationEndpoint(
			invitationRepository,
			secondaryUserRepository,
			invitationCode,
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual(invitation);
		// No need for the fallback secondary user record lookup when the
		// invitation itself was found.
		expect(mockListByInvitationCode).not.toHaveBeenCalled();
	});
});
