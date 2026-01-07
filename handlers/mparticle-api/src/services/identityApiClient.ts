import { logger } from '@modules/routing/logger';
import { z } from 'zod';
import type { HttpResponse } from './make-http-request';
import { RestRequestMaker } from './make-http-request';

const IdentityUserResponseSchema = z.object({
	status: z.string(),
	user: z.object({
		id: z.string(),
		privateFields: z
			.object({
				brazeUuid: z.string().optional(),
			})
			.default({}),
	}),
});

type IdentityUserResponse = z.infer<typeof IdentityUserResponseSchema>;

export interface IdentityUser {
	identityId: string;
	brazeUuid?: string;
}

export class IdentityApiClient {
	private readonly rest: RestRequestMaker;

	constructor(baseUrl: string, accessToken: string) {
		this.rest = new RestRequestMaker(
			baseUrl,
			{
				'X-GU-ID-Client-Access-Token': `Bearer ${accessToken}`,
			},
			fetch,
		);
	}

	async getUser(identityId: string): Promise<IdentityUser | null> {
		logger.log(`Fetching Identity API user ${identityId}`);

		try {
			const response: HttpResponse<IdentityUserResponse> =
				await this.rest.makeRESTRequest(logger.getCallerInfo(1))(
					'GET',
					`/user/${identityId}`,
					IdentityUserResponseSchema,
				);

			if (!response.success) {
				logger.error(
					`Failed to fetch user ${identityId} from Identity API`,
					response.error,
				);
				return null;
			}

			return {
				identityId: response.data.user.id,
				brazeUuid: response.data.user.privateFields.brazeUuid,
			};
		} catch (error) {
			logger.error(
				`Error fetching user ${identityId} from Identity API`,
				error,
			);
			return null;
		}
	}
}
