import { withParsers } from '@modules/routing/withParsers';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import type {
	EventsAPI,
	MParticleClient,
} from '../../services/mparticleClient';

const stage: Stage = stageFromEnvironment();

const consentsBodyParser = z.object({
	consented: z.boolean(),
	pageViewId: z.string(), // is this useful?
});
type ConsentsBody = z.infer<typeof consentsBodyParser>;

export type BrowserId = string & {
	readonly __brand: 'BrowserId';
};

const browserIdSchema = z
	.string()
	.nonempty('browser ids must be non empty')
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- need to refine during deserialisation
	.transform((val: string) => val as BrowserId);

const consentsPathParser = z
	.object({
		browserId: browserIdSchema,
	})
	.transform((path) => path.browserId);

export class ConsentsUpdateHandler {
	constructor(private updateConsentState: UpdateConsentState) {}

	static handler(
		mParticleClient: MParticleClient<EventsAPI>,
		getNow: () => Date,
	) {
		const consentsUpdateHandler = new ConsentsUpdateHandler(
			new UpdateConsentState(mParticleClient, getNow),
		);
		return withParsers(
			consentsPathParser,
			consentsBodyParser,
			consentsUpdateHandler.authenticatedHandler.bind(this),
		);
	}

	private async authenticatedHandler(
		event: APIGatewayProxyEvent,
		browserId: BrowserId,
		body: ConsentsBody,
	): Promise<APIGatewayProxyResult> {
		const { consented, pageViewId } = body;
		await this.updateConsentState.updateConsentState(
			browserId,
			consented,
			pageViewId,
		);
		return {
			statusCode: 200,
			body: `consent update accepted for ${browserId}`,
		};
	}
}

export class UpdateConsentState {
	constructor(
		private mParticleClient: MParticleClient<EventsAPI>,
		private getNow: () => Date,
	) {}

	async updateConsentState(
		browserId: BrowserId,
		consented: boolean,
		pageViewId: string,
	) {
		const timestamp_unixtime_ms = this.getNow().getMilliseconds();
		// https://docs.mparticle.com/developers/apis/json-reference/#overall-structure
		const postBody = {
			environment: stage == 'PROD' ? 'production' : 'development',
			user_identities: {
				other_id_2: browserId,
			},
			user_attributes: {
				marketing_analysis_consented: consented,
				consent_update_page_view_id: pageViewId,
			},
			events: [
				// may not need the event
				{
					event_type: 'custom_event',
					data: {
						custom_event_type: 'user_preference',
						event_name: 'marketing analysis vendor consent updated',
						timestamp_unixtime_ms,
						custom_attributes: {
							consented,
							page_view_id: pageViewId,
						},
					},
				},
			],
		};
		await this.mParticleClient.post('v2/events', postBody, z.void());
	}
}
