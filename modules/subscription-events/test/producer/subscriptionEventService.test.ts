import type { EventBridgeService } from '@modules/aws/eventBridgeService';
import { SubscriptionEventService } from '@modules/subscription-events/producer/subscriptionEventService';

const eventBridgeWith = (putEvent: jest.Mock) =>
	({ putEvent }) as unknown as EventBridgeService;

describe('SubscriptionEventService', () => {
	describe('publishCancellationEvent', () => {
		it('validates and publishes a Cancellation event', async () => {
			const mockPutEvent = jest.fn().mockResolvedValueOnce({
				$metadata: {},
				FailedEntryCount: 0,
				Entries: [],
			});
			const publisher = new SubscriptionEventService(
				eventBridgeWith(mockPutEvent),
				'CODE',
				'lambda:zuora-auto-cancel',
			);

			await publisher.publishCancellationEvent({
				subscriptionNumber: 'A-S00001234' as never,
				orderNumber: 'O-00005678' as never,
				allowUserNotifications: true,
			});

			expect(mockPutEvent).toHaveBeenCalledWith(
				'subscription-events-CODE',
				'lambda:zuora-auto-cancel-CODE',
				'Cancellation',
				{
					subscriptionNumber: 'A-S00001234',
					orderNumber: 'O-00005678',
					allowUserNotifications: true,
				},
			);
		});

		it('rejects an invalid detail before calling putEvent', async () => {
			const mockPutEvent = jest.fn();
			const publisher = new SubscriptionEventService(
				eventBridgeWith(mockPutEvent),
				'CODE',
				'lambda:zuora-auto-cancel',
			);

			await expect(
				publisher.publishCancellationEvent({
					subscriptionNumber: 'has whitespace' as never,
					orderNumber: 'O-00005678' as never,
					allowUserNotifications: true,
				}),
			).rejects.toThrow();

			expect(mockPutEvent).not.toHaveBeenCalled();
		});
	});
});
