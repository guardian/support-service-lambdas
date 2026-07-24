import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { Handler } from 'aws-lambda';
import { awsConfig } from '@modules/aws/config';
import { buildAuthenticate } from '@modules/identity/apiGateway';
import { IdentityClient } from '@modules/identity/identityClient';
import { Lazy } from '@modules/lazy';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { badRequest } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withBodyParser, withPathParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { acceptInvitationEndpoint } from './acceptInvitationEndpoint';
import {
	createInvitationBodySchema,
	createInvitationEndpoint,
} from './createInvitationEndpoint';
import { deleteInvitationEndpoint } from './deleteInvitationEndpoint';
import {
	deleteSecondaryUserEndpoint,
	deleteSecondaryUserPathSchema,
} from './deleteSecondaryUserEndpoint';
import { getInvitationEndpoint } from './getInvitationEndpoint';
import { InvitationRepository } from './invitationRepository';
import { listInvitationsEndpoint } from './listInvitationsEndpoint';
import { listSecondaryUsersEndpoint } from './listSecondaryUsersEndpoint';
import { mmaPrimarySummaryEndpoint } from './mmaPrimarySummaryEndpoint';
import { invitationPathSchema, subscriptionPathSchema } from './schemas';
import { secondaryUserMeEndpoint } from './secondaryUserMeEndpoint';

const stage = stageFromEnvironment();
const authenticate = buildAuthenticate(stage, []);
const dynamoClient = new DynamoDBClient(awsConfig);
const invitationRepository = InvitationRepository.create(stage);
const secondaryUserRepository = SecondaryUserRepository.create(stage);
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
const lazyZuoraClient = new Lazy(
	async () => await ZuoraClient.create(stage),
	'Get Zuora client',
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
		httpMethod: 'GET',
		path: '/invitation/{invitationCode}',
		handler: withPathParser(invitationPathSchema, async (_event, path) =>
			getInvitationEndpoint(invitationRepository, path.invitationCode),
		),
	},
	{
		httpMethod: 'DELETE',
		path: '/invitation/{invitationCode}',
		handler: withPathParser(invitationPathSchema, async (event, path) => {
			// Both the primary (cancelling) and secondary (rejecting) users send
			// their identity id in the 'x-identity-id' header.
			const identityId = event.headers['x-identity-id'];
			if (!identityId) {
				return badRequest('The x-identity-id header is required');
			}
			return deleteInvitationEndpoint(
				invitationRepository,
				path.invitationCode,
				identityId,
			);
		}),
	},
	{
		httpMethod: 'POST',
		path: '/invitation/{invitationCode}/accept',
		handler: withPathParser(invitationPathSchema, async (event, path) => {
			const maybeAuthenticatedEvent = await authenticate(event);

			if (maybeAuthenticatedEvent.type === 'failure') {
				return maybeAuthenticatedEvent.response;
			}

			return acceptInvitationEndpoint(
				stage,
				invitationRepository,
				secondaryUserRepository,
				dynamoClient,
				maybeAuthenticatedEvent.userDetails.identityId,
				path.invitationCode,
			);
		}),
	},
	{
		httpMethod: 'GET',
		path: '/subscriptions/{subscriptionName}/invitations',
		handler: withPathParser(
			subscriptionPathSchema,
			withMMAIdentityCheck(
				stage,
				async (_body, _zuoraClient, subscription) =>
					listInvitationsEndpoint(
						invitationRepository,
						subscription.subscriptionNumber,
					),
				({ path }) => path.subscriptionName,
			),
		),
	},
	{
		httpMethod: 'GET',
		path: '/subscriptions/{subscriptionName}/secondary-users',
		handler: withPathParser(
			subscriptionPathSchema,
			withMMAIdentityCheck(
				stage,
				async (_body, _zuoraClient, subscription) =>
					listSecondaryUsersEndpoint(
						secondaryUserRepository,
						subscription.subscriptionNumber,
					),
				({ path }) => path.subscriptionName,
			),
		),
	},
	{
		httpMethod: 'DELETE',
		path: '/subscriptions/{subscriptionName}/secondary-users/{secondaryIdentityId}',
		handler: withPathParser(
			deleteSecondaryUserPathSchema,
			withMMAIdentityCheck(
				stage,
				async (_body, _zuoraClient, subscription, _account, path) =>
					deleteSecondaryUserEndpoint(
						stage,
						secondaryUserRepository,
						dynamoClient,
						path,
					),
				({ path }) => path.subscriptionName,
			),
		),
	},
	{
		httpMethod: 'GET',
		path: '/subscriptions/{subscriptionName}/mma-primary',
		handler: withPathParser(
			subscriptionPathSchema,
			withMMAIdentityCheck(
				stage,
				async (_body, _zuoraClient, subscription) =>
					mmaPrimarySummaryEndpoint(
						invitationRepository,
						secondaryUserRepository,
						await identityClientPromise,
						subscription.subscriptionNumber,
					),
				({ path }) => path.subscriptionName,
			),
		),
	},
	{
		httpMethod: 'GET',
		path: '/secondary-user/me',
		handler: async (event) => {
			const maybeAuthenticatedEvent = await authenticate(event);

			if (maybeAuthenticatedEvent.type === 'failure') {
				return maybeAuthenticatedEvent.response;
			}

			return secondaryUserMeEndpoint(
				maybeAuthenticatedEvent.userDetails.identityId,
				secondaryUserRepository,
				await lazyZuoraClient.get(),
			);
		},
	},
]);
