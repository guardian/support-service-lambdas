import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import type {
	DynamoDBClient,
	TransactWriteItem,
} from '@aws-sdk/client-dynamodb';
import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
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
	acceptedDate: '2026-06-12',
	expiryDate: 1781218800,
	...overrides,
});

const softDeleteTransaction: TransactWriteItem = {
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
	users: SecondaryUserRecord[],
): {
	repository: SecondaryUserRepository;
	mockGet: jest.Mock<Promise<SecondaryUserRecord[]>, [string]>;
	mockGetSoftDeleteTransaction: jest.Mock;
} => {
	const mockGet = jest
		.fn<Promise<SecondaryUserRecord[]>, [string]>()
		.mockResolvedValue(users);
	const mockGetSoftDeleteTransaction = jest
		.fn()
		.mockReturnValue(softDeleteTransaction);
	const repository = {
		get: mockGet,
		getSoftDeleteTransaction: mockGetSoftDeleteTransaction,
	} as unknown as SecondaryUserRepository;
	return { repository, mockGet, mockGetSoftDeleteTransaction };
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
		const { repository, mockGetSoftDeleteTransaction } = makeRepository([
			makeSecondaryUser(),
		]);
		const { client, mockSend } = makeDynamoClient();

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			{ subscriptionName, secondaryIdentityId },
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
		expect(command?.input.TransactItems?.[0]).toBe(softDeleteTransaction);
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
		const { repository, mockGetSoftDeleteTransaction } = makeRepository([
			makeSecondaryUser(),
		]);
		const { client } = makeDynamoClient();

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			{ subscriptionName, secondaryIdentityId },
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
		const { repository, mockGetSoftDeleteTransaction } = makeRepository([]);
		const { client, mockSend } = makeDynamoClient();

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			{ subscriptionName, secondaryIdentityId },
			primaryIdentityId,
		);

		expect(result.statusCode).toBe(404);
		expect(mockGetSoftDeleteTransaction).not.toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns 404 when the secondary user record is already cancelled', async () => {
		const { repository, mockGetSoftDeleteTransaction } = makeRepository([
			makeSecondaryUser({
				cancelledBy: 'primary',
				cancelledDate: '2026-07-29T00:00:00.000Z',
			}),
		]);
		const { client, mockSend } = makeDynamoClient();

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			{ subscriptionName, secondaryIdentityId },
			primaryIdentityId,
		);

		expect(result.statusCode).toBe(404);
		expect(mockGetSoftDeleteTransaction).not.toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns 400 when the identity id matches neither user', async () => {
		const { repository, mockGetSoftDeleteTransaction } = makeRepository([
			makeSecondaryUser(),
		]);
		const { client, mockSend } = makeDynamoClient();

		const result = await deleteSecondaryUserEndpoint(
			stage,
			repository,
			client,
			{ subscriptionName, secondaryIdentityId },
			'someone-else',
		);

		expect(result.statusCode).toBe(400);
		expect(mockGetSoftDeleteTransaction).not.toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});
});
