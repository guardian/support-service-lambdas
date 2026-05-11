import { getOrCreateIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import type { InvitationRepository } from './invitationRepository';
import {
	checkSubscriptionIsActiveDigitalPlus,
	validateInvitationInformation,
} from './validation';

export const createInvitationBodySchema = z.object({
	subscriptionName: z.string(),
	secondaryUserEmail: z.string().email(),
});

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>;

const generateInvitationCode = customAlphabet(
	'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
	12,
);

export const createInvitationEndpoint =
	(
		invitationRepository: InvitationRepository,
		identityClient: IdentityClient,
		zuoraCatalog: ZuoraCatalog,
		productCatalog: ProductCatalog,
	) =>
	async (
		body: CreateInvitationBody,
		_zuoraClient: ZuoraClient,
		zuoraSubscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		const { subscriptionName } = body;
		logger.mutableAddContext(subscriptionName);

		checkSubscriptionIsActiveDigitalPlus(
			zuoraSubscription,
			zuoraCatalog,
			productCatalog,
		);

		const secondaryIdentityId = await getOrCreateIdentityId(
			identityClient,
			body.secondaryUserEmail,
		);

		await validateInvitationInformation(
			invitationRepository,
			subscriptionName,
			secondaryIdentityId,
		);

		const now = dayjs();
		const invitationCode = generateInvitationCode();

		await invitationRepository.save({
			subscriptionName: body.subscriptionName,
			invitationCode,
			primaryIdentityId: account.basicInfo.identityId,
			secondaryIdentityId,
			invitedDate: zuoraDateFormat(now),
			expiryDate: now.add(1, 'month').toDate().getTime(),
		});

		// TODO: do we trigger the invite email from here?

		return {
			statusCode: 201,
			body: JSON.stringify({ invitationCode }),
		};
	};
