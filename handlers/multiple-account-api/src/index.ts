import { buildAuthenticate } from '@modules/identity/apiGateway';
import { IdentityClient } from '@modules/identity/identityClient';
import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withBodyParser, withPathParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler } from 'aws-lambda';
import {
	acceptInvitationBodySchema,
	acceptInvitationEndpoint,
} from './acceptInvitationEndpoint';
import {
	createInvitationBodySchema,
	createInvitationEndpoint,
} from './createInvitationEndpoint';
import {
	deleteInvitationEndpoint,
	deleteInvitationPathSchema,
} from './deleteInvitationEndpoint';
import { InvitationRepository } from './invitationRepository';

const stage = stageFromEnvironment();
const authenticate = buildAuthenticate(stage, []);
const invitationRepository = InvitationRepository.create(stage);
const identityClientPromise = IdentityClient.create(
	stage,
	`/${stage}/support/multiple-account-api/identity-client-access-token`,
);
const lazyProductCatalog = new Lazy(
	async () => await getProductCatalogFromApi(stage),
	'Get product catalog',
);
const lazyZuoraCatalog = new Lazy(
	async () => await getZuoraCatalogFromS3(stage),
	'Get Zuora catalog',
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
					return createInvitationEndpoint(
						invitationRepository,
						identityClient,
						await lazyZuoraCatalog.get(),
						await lazyProductCatalog.get(),
					)(body, zuoraClient, subscription, account);
				},
				({ body }) => body.subscriptionName,
			),
		),
	},
	{
		httpMethod: 'DELETE',
		path: '/invitation/{invitationCode}',
		handler: withPathParser(deleteInvitationPathSchema, async (_event, path) =>
			deleteInvitationEndpoint(invitationRepository)(path),
		),
	},
	{
		httpMethod: 'PUT',
		path: '/invitation',
		handler: withBodyParser(
			acceptInvitationBodySchema,
			async (event, path, body) => {
				const maybeAuthenticatedEvent = await authenticate(event);

				if (maybeAuthenticatedEvent.type === 'failure') {
					return maybeAuthenticatedEvent.response;
				}

				return acceptInvitationEndpoint(
					maybeAuthenticatedEvent.userDetails.identityId,
					body.invitationCode,
					invitationRepository,
				);
			},
		),
	},
]);
