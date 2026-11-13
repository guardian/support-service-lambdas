import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { z } from 'zod';
import {
	eventBridgeEnvelopeSchema,
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

		await publisher.putEvent(
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

describe('eventBridgeEnvelopeSchema', () => {
	const detailSchema = z.object({ foo: z.string() });
	const schema = eventBridgeEnvelopeSchema('MyEvent', detailSchema);

	const validEnvelope = {
		version: '0',
		id: '9773f4b3-ff25-5ef2-b41b-791f868d424e',
		'detail-type': 'MyEvent',
		source: 'lambda:my-lambda-CODE',
		account: '123456789',
		time: '2026-09-07T14:41:33Z',
		region: 'eu-west-1',
		resources: [],
		detail: { foo: 'bar' },
	};

	it('parses a valid envelope', () => {
		expect(schema.parse(validEnvelope)).toEqual(validEnvelope);
	});

	it('strips unknown fields from the envelope', () => {
		const result = schema.parse({ ...validEnvelope, extra: 'field' });
		expect(result).not.toHaveProperty('extra');
	});

	it('strips unknown fields from detail', () => {
		const result = schema.parse({
			...validEnvelope,
			detail: { foo: 'bar', extra: 'field' },
		});
		expect(result.detail).toEqual({ foo: 'bar' });
	});

	it('rejects a mismatching detail-type', () => {
		expect(() =>
			schema.parse({ ...validEnvelope, 'detail-type': 'OtherEvent' }),
		).toThrow();
	});

	it('rejects an invalid detail', () => {
		expect(() =>
			schema.parse({ ...validEnvelope, detail: { foo: 123 } }),
		).toThrow();
	});
});
