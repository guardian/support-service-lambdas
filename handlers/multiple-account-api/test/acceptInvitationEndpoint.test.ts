import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { acceptInvitationEndpoint } from '../src/acceptInvitationEndpoint';
import type { InvitationRepository } from '../src/invitationRepository';

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
	it('returns 409 when the invitation has already been accepted by this user', async () => {
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

		expect(result.statusCode).toBe(409);
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
