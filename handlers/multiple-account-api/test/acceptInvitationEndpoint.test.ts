import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { acceptInvitationEndpoint } from '../src/acceptInvitationEndpoint';
import type {
	InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';

const stage = 'CODE';
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
	mockListByIdentity: jest.Mock;
} => {
	const mockListByIdentity = jest.fn().mockResolvedValue(secondaryUsers);
	const repository = {
		listByIdentity: mockListByIdentity,
	} as unknown as SecondaryUserRepository;
	return { repository, mockListByIdentity };
};

const dynamoClient = {} as DynamoDBClient;

describe('acceptInvitationEndpoint', () => {
	it('returns 410 when the invitation has already been soft-accepted (acceptedDate is set)', async () => {
		const { repository: invitationRepository, mockGet } =
			makeInvitationRepository(
				makeInvitation({ acceptedDate: '2026-06-12T00:00:00.000Z' }),
			);
		const { repository: secondaryUserRepository, mockListByIdentity } =
			makeSecondaryUserRepository([]);

		const result = await acceptInvitationEndpoint(
			stage,
			invitationRepository,
			secondaryUserRepository,
			dynamoClient,
			secondaryIdentityId,
			invitationCode,
		);

		expect(result.statusCode).toBe(410);
		expect(mockGet).toHaveBeenCalledWith(invitationCode);
		// The invitation itself already tells us it's accepted, so there's no
		// need for the fallback secondary user record lookup.
		expect(mockListByIdentity).not.toHaveBeenCalled();
	});

	it('returns 410 when the invitation record no longer exists (TTL-expired) but a secondary user record exists', async () => {
		const { repository: invitationRepository, mockGet } =
			makeInvitationRepository();
		const { repository: secondaryUserRepository, mockListByIdentity } =
			makeSecondaryUserRepository([makeSecondaryUser()]);

		const result = await acceptInvitationEndpoint(
			stage,
			invitationRepository,
			secondaryUserRepository,
			dynamoClient,
			secondaryIdentityId,
			invitationCode,
		);

		expect(result.statusCode).toBe(410);
		expect(mockGet).toHaveBeenCalledWith(invitationCode);
		expect(mockListByIdentity).toHaveBeenCalledWith(secondaryIdentityId);
	});

	it('returns 404 when the invitation is not found and there is no matching secondary user record', async () => {
		const { repository: invitationRepository } = makeInvitationRepository();
		const { repository: secondaryUserRepository } = makeSecondaryUserRepository(
			[],
		);

		const result = await acceptInvitationEndpoint(
			stage,
			invitationRepository,
			secondaryUserRepository,
			dynamoClient,
			secondaryIdentityId,
			invitationCode,
		);

		expect(result.statusCode).toBe(404);
	});

	it('returns 404 when the invitation is not found and the signed in user has other secondary user records but none matching this invitation code', async () => {
		const { repository: invitationRepository } = makeInvitationRepository();
		const { repository: secondaryUserRepository } = makeSecondaryUserRepository(
			[makeSecondaryUser({ invitationCode: 'some-other-code' })],
		);

		const result = await acceptInvitationEndpoint(
			stage,
			invitationRepository,
			secondaryUserRepository,
			dynamoClient,
			secondaryIdentityId,
			invitationCode,
		);

		expect(result.statusCode).toBe(404);
	});
});
