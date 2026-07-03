import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { Handler } from 'aws-lambda';
import { awsConfig } from '@modules/aws/config';
import { buildAuthenticate } from '@modules/identity/apiGateway';
import { IdentityClient } from '@modules/identity/identityClient';
import { Lazy } from '@modules/lazy';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withBodyParser, withPathParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import {
	acceptInvitationEndpoint,
	acceptInvitationPathSchema,
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
import {
	listInvitationsEndpoint,
	listInvitationsPathSchema,
} from './listInvitationsEndpoint';
import {
	listSecondaryUsersEndpoint,
	listSecondaryUsersPathSchema,
} from './listSecondaryUsersEndpoint';

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
		httpMethod: 'POST',
		path: '/invitation/{invitationCode}/accept',
		handler: withPathParser(acceptInvitationPathSchema, async (event, path) => {
			const maybeAuthenticatedEvent = await authenticate(event);

			if (maybeAuthenticatedEvent.type === 'failure') {
				return maybeAuthenticatedEvent.response;
			}

			return acceptInvitationEndpoint(
				stage,
				maybeAuthenticatedEvent.userDetails.identityId,
				path.invitationCode,
				invitationRepository,
				secondaryUserRepository,
				dynamoClient,
			);
		}),
	},
	{
		httpMethod: 'GET',
		path: '/subscriptions/{subscriptionName}/invitations',
		handler: withPathParser(
			listInvitationsPathSchema,
			withMMAIdentityCheck(
				stage,
				async (_body, _zuoraClient, subscription) =>
					listInvitationsEndpoint(invitationRepository)({
						subscriptionName: subscription.subscriptionNumber,
					}),
				({ path }) => path.subscriptionName,
			),
		),
	},
	{
		httpMethod: 'GET',
		path: '/subscriptions/{subscriptionName}/secondary-users',
		handler: withPathParser(
			listSecondaryUsersPathSchema,
			withMMAIdentityCheck(
				stage,
				async (_body, _zuoraClient, subscription) =>
					listSecondaryUsersEndpoint(secondaryUserRepository)({
						subscriptionName: subscription.subscriptionNumber,
					}),
				({ path }) => path.subscriptionName,
			),
		),
	},
]);
