import type { PutEventsCommandOutput } from '@aws-sdk/client-eventbridge';
import {
	EventBridgeClient,
	PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { awsConfig } from '@modules/aws/config';
import { wrapAwsClient } from '@modules/logger/wrapAwsClient';

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
	): Promise<PutEventsCommandOutput> {
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
					`EventBridge PutEvents reported ${response.FailedEntryCount} failed entries: ${JSON.stringify(
						response.Entries,
					)}`,
				),
			);
		}
		return response;
	}
}

export class EventBridgePutError extends Error {
	constructor(cause: unknown) {
		super(`Failed to put event to EventBridge: ${String(cause)}`, { cause });
		this.name = 'EventBridgePutError';
	}
}
