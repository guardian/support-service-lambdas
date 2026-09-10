import { getUserByIdentityId } from '@modules/identity/idapi';
import { logger } from '@modules/logger/logger';
import { getIdentityClient } from '../helpers';

export class BrazeUuidMissingError extends Error {
	constructor() {
		super('Identity user does not have a Braze UUID');
		this.name = 'BrazeUuidMissingError';
	}
}

export const getBrazeUuidFromIdapi = async (
	identityId: string,
): Promise<string | undefined> => {
	const identityClient = await getIdentityClient();
	const user = await getUserByIdentityId(identityClient, identityId);
	if (!user) {
		logger.log('No Identity user found for the supplied Identity ID');
		return undefined;
	}

	const brazeUuid = user.privateFields?.brazeUuid;
	if (!brazeUuid) {
		throw new BrazeUuidMissingError();
	}

	return brazeUuid;
};
