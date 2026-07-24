import { logger } from '@modules/logger/logger';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';

export const listSecondaryUsersEndpoint = async (
	secondaryUserRepository: SecondaryUserRepository,
	subscriptionName: string,
) => {
	try {
		logger.mutableAddContext(subscriptionName);
		const secondaryUsers = await secondaryUserRepository.list(subscriptionName);
		return ok({ secondaryUsers });
	} catch (error) {
		return buildErrorResponse(error);
	}
};
