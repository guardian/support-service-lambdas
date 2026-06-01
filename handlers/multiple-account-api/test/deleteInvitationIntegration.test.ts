/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
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
const tableName = `multiple-account-invitation-${stage}`;
const repository = new InvitationRepository(
	new DynamoDBClient(getAwsConfig('membership')),
	tableName,
);

const buildInvitationRecord = (suffix: string): InvitationRecord => ({
	subscriptionName: 'A-S00099999',
	invitationCode: `it-delete-${suffix}`,
	primaryIdentityId: '12345678',
	secondaryIdentityId: '87654321',
	invitedDate: new Date().toISOString(),
	expiryDate: dayjs().add(10, 'seconds').toDate().getTime(),
});

test('deleteInvitationEndpoint deletes the invitation and returns 204', async () => {
	const record = buildInvitationRecord(Date.now().toString());
	await repository.save(record);

	const endpoint = deleteInvitationEndpoint(repository);
	const result = await endpoint({
		subscriptionName: record.subscriptionName,
		invitationCode: record.invitationCode,
	});

	expect(result.statusCode).toBe(204);
	await expect(
		repository.get(record.subscriptionName, record.invitationCode),
	).resolves.toBeUndefined();
});
