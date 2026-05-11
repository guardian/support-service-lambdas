import { ValidationError } from '@modules/errors';
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
const MAXIMUM_NUMBER_OF_INVITES = 5;

async function validateInvitationInformation(
	repo: InvitationRepository,
	subscriptionName: string,
	secondaryIdentityId: string,
) {
	logger.log('Validating invitation information');

	const currentInvites = await repo.list(subscriptionName);

	const inviteAlreadyExistsForUser = currentInvites.find(
		(invite) => invite.secondaryIdentityId === secondaryIdentityId,
	);

	if (inviteAlreadyExistsForUser) {
		throw new ValidationError('An invite already exists for this subscription');
	}

	const subscriptionHasAvailableInvites =
		currentInvites.length < MAXIMUM_NUMBER_OF_INVITES;

	if (!subscriptionHasAvailableInvites) {
		throw new ValidationError(
			'This subscription already has the maximum number of invites',
		);
	}
	//TODO: other validation?
}

export const createInvitationEndpoint =
	(repo: InvitationRepository, identityClient: IdentityClient) =>
	async (
		body: CreateInvitationBody,
		_zuoraClient: ZuoraClient,
		_subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		const { subscriptionName } = body;
		logger.mutableAddContext(subscriptionName);

		const secondaryIdentityId = await getOrCreateIdentityId(
			identityClient,
			body.secondaryUserEmail,
		);

		await validateInvitationInformation(
			repo,
			subscriptionName,
			secondaryIdentityId,
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
