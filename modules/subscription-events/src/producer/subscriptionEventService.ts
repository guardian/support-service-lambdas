import type { EventBridgeService } from '@modules/aws/eventBridgeService';
import type { Stage } from '@modules/stage';
import type { CancellationDetail } from '@modules/subscription-events/shared/cancellationEvent';
import { cancellationDetailSchema } from '@modules/subscription-events/shared/cancellationEvent';
import type { SubscriptionEventSource } from '@modules/subscription-events/shared/source';

/**
 * Publishes events onto the subscription-events bus, for a single source.
 *
 * <pre>
 *   // in the cold start handler/wiring
 *   subService = new SubscriptionEventService(....)
 *
 *   // in your code
 *   subService.publishCancellationEvent({
 *     subscriptionNumber: 'A-S123',
 *     orderNumber: 'O-123',
 *     allowUserNotifications: true,
 *   });
 */
export class SubscriptionEventService {
	constructor(
		private readonly eventBridge: EventBridgeService, // from `EventBridgeService.create()`
		private readonly stage: Stage,
		private readonly source: SubscriptionEventSource,
	) {}

	/**
	 * Publishes a `Cancellation` event onto the subscription-events bus.
	 *
	 * @param detail the Cancellation event's detail payload
	 */
	async publishCancellationEvent(detail: CancellationDetail) {
		// double check runtime type before allowing onto the bus
		const validatedDetail = cancellationDetailSchema.strict().parse(detail);
		return this.eventBridge.putEvent(
			`subscription-events-${this.stage}`,
			`${this.source}-${this.stage}`,
			'Cancellation',
			validatedDetail,
		);
	}
}
