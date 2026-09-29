import type { PutEventsCommandOutput } from '@aws-sdk/client-eventbridge';
import {
	EventBridgeClient,
	PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { z } from 'zod';
import { awsConfig } from '@modules/aws/config';
import { wrapAwsClient } from '@modules/logger/wrapAwsClient';

/**
 * Builds the schema for one EventBridge event "shape": the standard envelope
 * fields (as documented at
 * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html)
 * plus a specific `detail-type` literal and `detail` schema, so a bus's full set of
 * event types can be composed into a `z.discriminatedUnion('detail-type', [...])`.
 *
 * @param detailType the exact `detail-type` value this producer sends, used to
 *   discriminate this event from others on the same bus
 * @param detailSchema schema for this event's `detail` payload
 */
export function eventBridgeEnvelopeSchema<
	DetailType extends string,
	DetailSchema extends z.ZodType,
>(detailType: DetailType, detailSchema: DetailSchema) {
	return z.object({
		version: z.string(),
		id: z.string(),
		'detail-type': z.literal(detailType),
		source: z.string(),
		account: z.string(),
		time: z.string(),
		region: z.string(),
		resources: z.array(z.string()),
		detail: detailSchema,
	});
}

/**
 * Thin wrapper around EventBridge's PutEvents API for putting a single event onto
 * a bus.
 *
 * In real code, build one via `EventBridgeService.create()` - this wraps the
 * client with `wrapAwsClient` (see `@modules/logger/wrapAwsClient`), so every
 * request/response is logged automatically and `putEvent` itself doesn't need to
 * log anything. In tests, construct directly with a mock client instead.
 */
export class EventBridgeService {
	public constructor(readonly client: EventBridgeClient) {}

	static create(): EventBridgeService {
		return new EventBridgeService(
			wrapAwsClient(new EventBridgeClient(awsConfig)),
		);
	}

	async putEvent(
		eventBusName: string,
		source: string,
		detailType: string,
		detail: unknown,
	): Promise<void> {
		const command = new PutEventsCommand({
			Entries: [
				{
					EventBusName: eventBusName,
					Source: source,
					DetailType: detailType,
					Detail: JSON.stringify(detail),
				},
			],
		});
		const response = await this.client.send(command).catch((error: unknown) => {
			throw new EventBridgePutError(error);
		});
		if (response.FailedEntryCount) {
			throw new EventBridgePutError(
				new Error(
					`EventBridge PutEvents reported ${response.FailedEntryCount} failed entries`,
				),
				response,
			);
		}
	}
}

export class EventBridgePutError extends Error {
	constructor(
		cause: unknown,
		public response?: PutEventsCommandOutput,
	) {
		super(`Failed to put event to EventBridge`, { cause });
		this.name = this.constructor.name;
	}
}
