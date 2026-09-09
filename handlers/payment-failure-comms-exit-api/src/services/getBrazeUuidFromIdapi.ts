import { getUserByIdentityId } from '@modules/identity/idapi';
import { logger } from '@modules/logger/logger';
import { getIdentityClient } from '../helpers';

export const getBrazeUuidFromIdapi = async (
	identityId: string,
): Promise<string | undefined> => {
	const identityClient = await getIdentityClient();
	const user = await getUserByIdentityId(identityClient, identityId);
	const brazeUuid = user?.privateFields?.brazeUuid?.trim();

	if (!brazeUuid) {
		logger.log('No Braze UUID found for the supplied Identity ID');
		return undefined;
	}

	return brazeUuid;
};
