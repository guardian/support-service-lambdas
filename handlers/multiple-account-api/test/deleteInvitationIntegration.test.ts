/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { getAwsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import dayjs from 'dayjs';
import { deleteInvitationEndpoint } from '../src/deleteInvitationEndpoint';
import {
	type InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';

const stage: Stage = 'CODE';
const repo = new InvitationRepository(
	new DynamoDBClient(getAwsConfig('membership')),
	`multiple-account-invitation-${stage}`,
);

const recordsToCleanup: InvitationRecord[] = [];

const buildRecord = (
	subscriptionName: string,
	invitationCode: string,
): InvitationRecord => ({
	subscriptionName,
	invitationCode,
	primaryIdentityId: '12345678',
	secondaryUserEmail: 'integration-test@thegulocal.com',
	secondaryIdentityId: '87654321',
	invitedDate: new Date().toISOString(),
	expiryDate: dayjs().add(10, 'seconds').toDate().getTime(),
});

const saveRecord = async (record: InvitationRecord): Promise<void> => {
	await repo.save(record);
	recordsToCleanup.push(record);
};

afterEach(async () => {
	await Promise.all(
		recordsToCleanup
			.splice(0)
			.map((record) =>
				repo.delete(record.subscriptionName, record.invitationCode),
			),
	);
});

test('deleteInvitationEndpoint deletes invitation and returns 204', async () => {
	const invitationCode = `it-delete-${Date.now()}`;
	const record = buildRecord('A-S00099999', invitationCode);
	await saveRecord(record);

	const endpoint = deleteInvitationEndpoint(repo);
	const result = await endpoint({ invitationCode });

	expect(result.statusCode).toBe(204);
	await expect(repo.get(record.invitationCode)).resolves.toBeUndefined();
});

test('deleteInvitationEndpoint returns 404 when invitation is not found', async () => {
	const endpoint = deleteInvitationEndpoint(repo);
	const result = await endpoint({ invitationCode: `it-missing-${Date.now()}` });

	expect(result.statusCode).toBe(404);
});
