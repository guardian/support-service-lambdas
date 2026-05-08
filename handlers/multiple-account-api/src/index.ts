import { IdentityClient } from '@modules/identity/identityClient';
import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withBodyParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import {
	createInvitationBodySchema,
	createInvitationEndpoint,
} from './createInvitationEndpoint';
import { InvitationRepository } from './invitationRepository';

const stage = stageFromEnvironment();
const repo = InvitationRepository.create(stage);
const identityClientPromise = IdentityClient.create(
	stage,
	`/${stage}/support/multiple-account-api/identity-client-access-token`,
);

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/invitation',
		handler: withBodyParser(
			createInvitationBodySchema,
			withMMAIdentityCheck(
				stage,
				async (body, zuoraClient, subscription, account) => {
					const identityClient = await identityClientPromise;
					return createInvitationEndpoint(repo, identityClient)(
						body,
						zuoraClient,
						subscription,
						account,
					);
				},
				({ body }) => body.subscriptionName,
			),
		),
	},
]);
