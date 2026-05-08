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
import { InvitationRepository } from '../src/invitationRepository';

const stage: Stage = 'CODE';

const testRecord = {
	subscriptionName: 'A-S00099999',
	invitationCode: 'it-test-code',
	primaryIdentityId: '12345678',
	secondaryIdentityId: '87654321',
	invitedDate: new Date().toISOString(),
	expiryDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
};

const repo = new InvitationRepository(
	new DynamoDBClient(getAwsConfig('membership')),
	`multiple-account-invitation-${stage}`,
);

afterEach(async () => {
	await repo.delete(testRecord.subscriptionName, testRecord.invitationCode);
});

test('InvitationRepository saves and retrieves a record from DynamoDB', async () => {
	await repo.save(testRecord);

	const saved = await repo.get(
		testRecord.subscriptionName,
		testRecord.invitationCode,
	);

	expect(saved).toEqual(testRecord);
});
