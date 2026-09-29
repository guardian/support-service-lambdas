import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { PutEventsCommand } from '@aws-sdk/client-eventbridge';
import {
	EventBridgePutError,
	EventBridgeService,
} from '../src/eventBridgeService';

const clientWith = (send: jest.Mock) =>
	({ send }) as unknown as EventBridgeClient;

describe('EventBridgeService.putEvent', () => {
	it('puts a single event and returns the response', async () => {
		const mockSend = jest.fn().mockResolvedValueOnce({
			FailedEntryCount: 0,
			Entries: [{ EventId: 'abc' }],
		});
		const publisher = new EventBridgeService(clientWith(mockSend));

		const response = await publisher.putEvent(
			'subscription-events-CODE',
			'lambda:my-lambda-CODE',
			'Cancellation',
			{ subscriptionName: 'A-S00000001' },
		);

		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend).toHaveBeenCalledWith(expect.any(PutEventsCommand));
		const command = (
			mockSend.mock.calls[0] as unknown[]
		)[0] as PutEventsCommand;
		expect(command.input).toEqual({
			Entries: [
				{
					EventBusName: 'subscription-events-CODE',
					Source: 'lambda:my-lambda-CODE',
					DetailType: 'Cancellation',
					Detail: JSON.stringify({ subscriptionName: 'A-S00000001' }),
				},
			],
		});
		expect(response.Entries).toEqual([{ EventId: 'abc' }]);
	});

	it('throws an EventBridgePutError if the send call rejects', async () => {
		const mockSend = jest.fn().mockRejectedValueOnce(new Error('boom'));
		const publisher = new EventBridgeService(clientWith(mockSend));

		await expect(
			publisher.putEvent(
				'subscription-events-CODE',
				'lambda:my-lambda-CODE',
				'Cancellation',
				{},
			),
		).rejects.toThrow(EventBridgePutError);
	});

	it('throws an EventBridgePutError if any entry fails', async () => {
		const mockSend = jest.fn().mockResolvedValueOnce({
			FailedEntryCount: 1,
			Entries: [{ ErrorCode: 'InternalFailure' }],
		});
		const publisher = new EventBridgeService(clientWith(mockSend));

		await expect(
			publisher.putEvent(
				'subscription-events-CODE',
				'lambda:my-lambda-CODE',
				'Cancellation',
				{},
			),
		).rejects.toThrow(EventBridgePutError);
	});
});
