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
import { SecondaryUserRepository } from '../src/secondaryUserRepository';

const stage: Stage = 'CODE';

const testRecord = {
	subscriptionName: 'A-S00099999',
	secondaryIdentityId: 'it-test-secondary-identity-id',
	primaryIdentityId: '12345678',
	acceptedDate: new Date().toISOString(),
	expiryDate: dayjs().add(10, 'seconds').toDate().getTime(),
};

const repo = new SecondaryUserRepository(
	new DynamoDBClient(getAwsConfig('membership')),
	`multiple-account-secondary-user-${stage}`,
);

afterEach(async () => {
	await repo.delete(
		testRecord.subscriptionName,
		testRecord.secondaryIdentityId,
	);
});

test('SecondaryUserRepository saves and retrieves a record from DynamoDB', async () => {
	await repo.save(testRecord);

	const saved = await repo.get(testRecord.secondaryIdentityId);

	expect(saved).toEqual([testRecord]);
});
