import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import { z } from 'zod';
import type { SecondaryUserRepository } from './secondaryUserRepository';

export const listSecondaryUsersPathSchema = z.object({
	subscriptionName: z.string(),
});

export type ListSecondaryUsersBody = z.infer<
	typeof listSecondaryUsersPathSchema
>;

export const listSecondaryUsersEndpoint =
	(secondaryUserRepository: SecondaryUserRepository) =>
	async ({ subscriptionName }: ListSecondaryUsersBody) => {
		try {
			logger.mutableAddContext(subscriptionName);
			const secondaryUsers =
				await secondaryUserRepository.list(subscriptionName);
			return ok({ secondaryUsers });
		} catch (error) {
			return buildErrorResponse(error);
		}
	};
