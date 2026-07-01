/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
import { IdentityClient } from '@modules/identity/identityClient';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { InvitationRepository } from '../src/invitationRepository';
import {
	mmaPrimarySummaryEndpoint,
	mmaPrimarySummaryResponseSchema,
} from '../src/mmaPrimarySummaryEndpoint';

const stage = 'CODE';
const subscriptionName = 'A-S00974337';

test('mmaPrimarySummaryEndpoint returns invitations and secondary users with name information', async () => {
	const invitationRepository = InvitationRepository.create(stage);
	const secondaryUserRepository = SecondaryUserRepository.create(stage);
	const identityClient = await IdentityClient.create(
		stage,
		`/${stage}/support/multiple-account-api/identity-client-access-token`,
	);

	const endpoint = mmaPrimarySummaryEndpoint(
		invitationRepository,
		secondaryUserRepository,
		identityClient,
	);

	const result = await endpoint({ subscriptionName });

	expect(result.statusCode).toBe(200);

	const body = mmaPrimarySummaryResponseSchema.parse(JSON.parse(result.body));
	expect(Array.isArray(body.invitations)).toBe(true);
	expect(Array.isArray(body.secondaryUsers)).toBe(true);
});
