/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import dayjs from 'dayjs';
import { getAwsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
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

test('deleteInvitationEndpoint soft deletes invitation and returns 204', async () => {
	const invitationCode = `it-delete-${Date.now()}`;
	const record = buildRecord('A-S00099999', invitationCode);
	await saveRecord(record);

	const result = await deleteInvitationEndpoint(
		repo,
		invitationCode,
		record.primaryIdentityId,
	);

	expect(result.statusCode).toBe(204);

	// The record is soft deleted: it still exists but now has cancelledBy and
	// cancelledDate set and an updated TTL (expiryDate) roughly 2 weeks in the future.
	const softDeleted = await repo.get(invitationCode);
	expect(softDeleted?.cancelledBy).toBe('primary');
	expect(softDeleted?.cancelledDate).toBeDefined();
	expect(dayjs(softDeleted?.cancelledDate).isValid()).toBe(true);
	expect(softDeleted?.expiryDate).toBeGreaterThan(
		dayjs().add(13, 'days').unix(),
	);
});

test('deleteInvitationEndpoint records cancelledBy as secondary when the secondary user rejects', async () => {
	const invitationCode = `it-delete-secondary-${Date.now()}`;
	const record = buildRecord('A-S00099999', invitationCode);
	await saveRecord(record);

	const result = await deleteInvitationEndpoint(
		repo,
		invitationCode,
		record.secondaryIdentityId,
	);

	expect(result.statusCode).toBe(204);

	const softDeleted = await repo.get(invitationCode);
	expect(softDeleted?.cancelledBy).toBe('secondary');
	expect(softDeleted?.cancelledDate).toBeDefined();
	expect(dayjs(softDeleted?.cancelledDate).isValid()).toBe(true);
});

test('deleteInvitationEndpoint returns 400 when the identity id matches neither user', async () => {
	const invitationCode = `it-delete-badrequest-${Date.now()}`;
	const record = buildRecord('A-S00099999', invitationCode);
	await saveRecord(record);

	const result = await deleteInvitationEndpoint(
		repo,
		invitationCode,
		'not-a-matching-id',
	);

	expect(result.statusCode).toBe(400);
});

test('deleteInvitationEndpoint returns 404 when invitation is not found', async () => {
	const result = await deleteInvitationEndpoint(
		repo,
		`it-missing-${Date.now()}`,
		'12345678',
	);

	expect(result.statusCode).toBe(404);
});
