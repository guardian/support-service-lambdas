import type { ServiceOutputTypes } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
	type InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';

const tableName = 'multiple-account-invitation-CODE';
const subscriptionName = 'A-S00099999';
const newTTL = 1_800_000_000; // Unix seconds

const client = new DynamoDBClient({ region: 'eu-west-1' });
const invitationRepo = new InvitationRepository(client, tableName);

// Spys on client.send to mock DynamoDB responses
const invitationDynamoDb = jest.spyOn(
	client,
	'send',
) as unknown as jest.SpyInstance<
	Promise<Partial<ServiceOutputTypes>>,
	[command: Parameters<DynamoDBClient['send']>[0]]
>;

beforeEach(() => {
	invitationDynamoDb.mockReset();
});

afterAll(() => {
	invitationDynamoDb.mockRestore();
	client.destroy();
});

const invitation = (
	invitationCode: string,
	overrides: Partial<InvitationRecord> = {},
): InvitationRecord => ({
	subscriptionName,
	invitationCode,
	primaryIdentityId: 'primary-id',
	primaryUserFirstName: 'Joe',
	primaryUserEmail: 'primary@example.com',
	secondaryUserEmail: 'secondary@example.com',
	secondaryIdentityId: 'secondary-id',
	invitedDate: '2026-01-01T00:00:00.000Z',
	expiryDate: 1_900_000_000,
	...overrides,
});

const activeInvitations = [invitation('active-one'), invitation('active-two')];
const inactiveInvitations = [
	invitation('accepted', {
		acceptedDate: '2026-01-02T00:00:00.000Z',
	}),
	invitation('cancelled-primary', { cancelledBy: 'primary' }),
	invitation('cancelled-secondary', { cancelledBy: 'primary' }),
];

test('updates every active invitation, excluding the accepted and cancelled ones', async () => {
	invitationDynamoDb
		.mockResolvedValueOnce({
			Items: [...inactiveInvitations, ...activeInvitations].map((record) =>
				marshall(record),
			),
		})
		.mockResolvedValue({});

	await invitationRepo.updateSubscriptionTTLs(subscriptionName, newTTL);

	// One query followed by two active updates.
	expect(invitationDynamoDb).toHaveBeenCalledTimes(3);

	const updates = invitationDynamoDb.mock.calls.slice(1).map(([command]) => {
		expect(command).toBeInstanceOf(UpdateItemCommand);
		return command.input;
	});

	expect(updates).toEqual(
		['active-one', 'active-two'].map((invitationCode) => ({
			TableName: tableName,
			Key: {
				subscriptionName: { S: subscriptionName },
				invitationCode: { S: invitationCode },
			},
			ConditionExpression:
				'attribute_exists(subscriptionName) AND attribute_not_exists(acceptedDate) AND attribute_not_exists(cancelledBy)',
			UpdateExpression: 'SET expiryDate = :expiryDate',
			ExpressionAttributeValues: {
				':expiryDate': { N: newTTL.toString() },
			},
		})),
	);
});

test.each([
	['empty', []],
	['inactive-only', inactiveInvitations],
])(
	'no updates for an %s multiple-accounts-api table',
	async (_label, records) => {
		invitationDynamoDb.mockResolvedValueOnce({
			Items: records.map((record) => marshall(record)),
		});

		await expect(
			invitationRepo.updateSubscriptionTTLs(subscriptionName, newTTL),
		).resolves.toBeUndefined();

		expect(invitationDynamoDb).toHaveBeenCalledTimes(1);
	},
);

test('ignores invitation changes after the listActive query', async () => {
	const error = new Error('Invitation changed after querying');
	error.name = 'ConditionalCheckFailedException';

	invitationDynamoDb
		.mockResolvedValueOnce({
			Items: [
				marshall(invitation('changed')),
				marshall(invitation('still-active')),
			],
		})
		.mockRejectedValueOnce(error)
		.mockResolvedValueOnce({});

	await expect(
		invitationRepo.updateSubscriptionTTLs(subscriptionName, newTTL),
	).resolves.toBeUndefined();

	expect(invitationDynamoDb).toHaveBeenCalledTimes(3);
});

test.each(['query', 'update'])(
	'errors on unexpected %s failures',
	async (phase) => {
		const error = new Error('DynamoDB unavailable');

		if (phase === 'update') {
			invitationDynamoDb.mockResolvedValueOnce({
				Items: [marshall(invitation('active'))],
			});
		}
		invitationDynamoDb.mockRejectedValueOnce(error);

		await expect(
			invitationRepo.updateSubscriptionTTLs(subscriptionName, newTTL),
		).rejects.toBe(error);

		expect(invitationDynamoDb).toHaveBeenCalledTimes(phase === 'query' ? 1 : 2);
	},
);
