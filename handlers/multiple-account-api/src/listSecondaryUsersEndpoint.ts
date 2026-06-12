import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import { z } from 'zod';
import type { SecondaryUserRepository } from './secondaryUserRepository';

export const listSecondaryUsersBodySchema = z.object({
	subscriptionName: z.string(),
});

export type ListSecondaryUsersBody = z.infer<
	typeof listSecondaryUsersBodySchema
>;

export const listSecondaryUsersEndpoint =
	(secondaryUserRepository: SecondaryUserRepository) =>
	async (body: ListSecondaryUsersBody) => {
		try {
			const { subscriptionName } = body;
			logger.mutableAddContext(subscriptionName);
			const secondaryUsers =
				await secondaryUserRepository.list(subscriptionName);
			return ok({ secondaryUsers });
		} catch (error) {
			return buildErrorResponse(error);
		}
	};
