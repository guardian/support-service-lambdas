import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import type {
	DynamoDBClient,
	TransactWriteItem,
} from '@aws-sdk/client-dynamodb';
import type { IdentityClient } from '@modules/identity/identityClient';
import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { deleteSecondaryUserEndpoint } from '../src/deleteSecondaryUserEndpoint';

const stage = 'CODE';
const subscriptionName = 'A-S00974337';
const secondaryIdentityId = 'secondary-id';
const primaryIdentityId = 'primary-id';

const makeSecondaryUser = (
	overrides: Partial<SecondaryUserRecord> = {},
): SecondaryUserRecord => ({
	subscriptionName,
	secondaryIdentityId,
	primaryIdentityId,
	acceptedDate: '2026-06-12T00:00:00.000Z',
	expiryDate: 1781218800,
	invitationCode: 'RpwR62kMnAxe',
	...overrides,
});

const softDeleteTransactItem: TransactWriteItem = {
	Update: {
		TableName: 'multiple-account-secondary-user-CODE',
		Key: {
			subscriptionName: { S: subscriptionName },
			secondaryIdentityId: { S: secondaryIdentityId },
		},
		UpdateExpression: 'SET cancelledBy = :cancelledBy',
	},
};

const makeRepository = (
	secondaryUser: SecondaryUserRecord | undefined,
): {
	repository: SecondaryUserRepository;
	mockGetNonCancelledBySubscriptionAndIdentity: jest.Mock<
		Promise<SecondaryUserRecord | undefined>,
		[string, string]
	>;
	mockGetSoftDeleteTransaction: jest.Mock;
} => {
	const mockGetNonCancelledBySubscriptionAndIdentity = jest
		.fn<Promise<SecondaryUserRecord | undefined>, [string, string]>()
		.mockResolvedValue(secondaryUser);
	const mockGetSoftDeleteTransaction = jest
		.fn()
		.mockReturnValue(softDeleteTransactItem);
	const repository = {
		getNonCancelledBySubscriptionAndIdentity:
			mockGetNonCancelledBySubscriptionAndIdentity,
		getSoftDeleteTransaction: mockGetSoftDeleteTransaction,
	} as unknown as SecondaryUserRepository;
	return {
		repository,
		mockGetNonCancelledBySubscriptionAndIdentity,
		mockGetSoftDeleteTransaction,
	};
};

const makeDynamoClient = (): {
	client: DynamoDBClient;
	mockSend: jest.Mock<Promise<unknown>, [TransactWriteItemsCommand]>;
} => {
	const mockSend = jest
		.fn<Promise<unknown>, [TransactWriteItemsCommand]>()
		.mockResolvedValue({});
	const client = { send: mockSend } as unknown as DynamoDBClient;
	return { client, mockSend };
};

describe('deleteSecondaryUserEndpoint', () => {
	it('soft deletes with cancelledBy "primary" when the primary user deletes', async () => {
		const { repository, mockGetSoftDeleteTransaction } =
			makeRepository(makeSecondaryUser());
		const { client, mockSend } = makeDynamoClient();
		const zuoraClient = {} as unknown as ZuoraClient;
		const identityClient = {} as unknown as IdentityClient;

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			zuoraClient,
			identityClient,
			subscriptionName,
			secondaryIdentityId,
			primaryIdentityId,
		);

		expect(result.statusCode).toBe(204);
		expect(mockGetSoftDeleteTransaction).toHaveBeenCalledWith(
			subscriptionName,
			secondaryIdentityId,
			'primary',
		);
		expect(mockSend).toHaveBeenCalledWith(
			expect.any(TransactWriteItemsCommand),
		);
		const command = mockSend.mock.calls[0]?.[0];
		expect(command?.input.TransactItems).toHaveLength(2);
		expect(command?.input.TransactItems?.[0]).toBe(softDeleteTransactItem);
		expect(command?.input.TransactItems?.[1]).toEqual({
			Delete: {
				TableName: 'SupporterProductData-CODE',
				Key: {
					subscriptionName: {
						S: `${subscriptionName}-${secondaryIdentityId}`,
					},
					identityId: { S: secondaryIdentityId },
				},
			},
		});
	});

	it('soft deletes with cancelledBy "secondary" when the secondary user deletes', async () => {
		const { repository, mockGetSoftDeleteTransaction } =
			makeRepository(makeSecondaryUser());
		const { client } = makeDynamoClient();
		const zuoraClient = {} as unknown as ZuoraClient;
		const identityClient = {} as unknown as IdentityClient;

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			zuoraClient,
			identityClient,
			subscriptionName,
			secondaryIdentityId,
			secondaryIdentityId,
		);

		expect(result.statusCode).toBe(204);
		expect(mockGetSoftDeleteTransaction).toHaveBeenCalledWith(
			subscriptionName,
			secondaryIdentityId,
			'secondary',
		);
	});

	it('returns 404 when the secondary user record is not found', async () => {
		const { repository, mockGetSoftDeleteTransaction } =
			makeRepository(undefined);
		const { client, mockSend } = makeDynamoClient();
		const zuoraClient = {} as unknown as ZuoraClient;
		const identityClient = {} as unknown as IdentityClient;

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			zuoraClient,
			identityClient,
			subscriptionName,
			secondaryIdentityId,
			primaryIdentityId,
		);

		expect(result.statusCode).toBe(404);
		expect(mockGetSoftDeleteTransaction).not.toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns 404 when the secondary user record is already cancelled', async () => {
		// The repository's getNonCancelledBySubscriptionAndIdentity filters out
		// cancelled records, so it resolves undefined for an already-cancelled user.
		const { repository, mockGetSoftDeleteTransaction } =
			makeRepository(undefined);
		const { client, mockSend } = makeDynamoClient();
		const zuoraClient = {} as unknown as ZuoraClient;
		const identityClient = {} as unknown as IdentityClient;

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			zuoraClient,
			identityClient,
			subscriptionName,
			secondaryIdentityId,
			primaryIdentityId,
		);

		expect(result.statusCode).toBe(404);
		expect(mockGetSoftDeleteTransaction).not.toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns 400 when the identity id matches neither user', async () => {
		const { repository, mockGetSoftDeleteTransaction } =
			makeRepository(makeSecondaryUser());
		const { client, mockSend } = makeDynamoClient();
		const zuoraClient = {} as unknown as ZuoraClient;
		const identityClient = {} as unknown as IdentityClient;

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			zuoraClient,
			identityClient,
			subscriptionName,
			secondaryIdentityId,
			'someone-else',
		);

		expect(result.statusCode).toBe(400);
		expect(mockGetSoftDeleteTransaction).not.toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});
});
