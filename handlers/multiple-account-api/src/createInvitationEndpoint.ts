import { getOrCreateIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/routing/logger';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import type { InvitationRepository } from './invitationRepository';

export const createInvitationBodySchema = z.object({
	subscriptionName: z.string(),
	secondaryUserEmail: z.string().email(),
});

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>;

const generateInvitationCode = customAlphabet(
	'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
	12,
);

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export const createInvitationEndpoint =
	(repo: InvitationRepository, identityClient: IdentityClient) =>
	async (
		body: CreateInvitationBody,
		_zuoraClient: ZuoraClient,
		_subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		logger.mutableAddContext(body.subscriptionName);

		//TODO: check that the user has no more than maximum invites
		//TODO: check that the secondary email does not already have an existing invite for this subscription
		//TODO: other validation?

		const secondaryIdentityId = await getOrCreateIdentityId(
			identityClient,
			body.secondaryUserEmail,
		);

		const now = new Date();
		const invitationCode = generateInvitationCode();

		await repo.save({
			subscriptionName: body.subscriptionName,
			invitationCode,
			primaryIdentityId: account.basicInfo.identityId,
			secondaryIdentityId,
			invitedDate: now.toISOString(),
			expiryDate: Math.floor(now.getTime() / 1000) + THIRTY_DAYS_IN_SECONDS,
		});

		// TODO: do we trigger the invite email from here?

		return {
			statusCode: 201,
			body: JSON.stringify({ invitationCode }),
		};
	};
