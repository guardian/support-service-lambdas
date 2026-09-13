import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { handleIdentityDeletionEvent } from '../../src/handlers/identityDeletionHandler';
import type { IdentityDeletionCleanupDependencies } from '../../src/types';

jest.mock('@modules/logger/logger', () => ({
	logger: { log: jest.fn() },
}));

function sqsRecord(body: object): SQSRecord {
	return {
		messageId: 'message-id',
		receiptHandle: 'receipt-handle',
		body: JSON.stringify(body),
		attributes: {
			ApproximateReceiveCount: '1',
			SentTimestamp: '0',
			SenderId: 'sender-id',
			ApproximateFirstReceiveTimestamp: '0',
		},
		messageAttributes: {},
		md5OfBody: 'md5',
		eventSource: 'aws:sqs',
		eventSourceARN: 'arn:aws:sqs:eu-west-1:000000000000:queue',
		awsRegion: 'eu-west-1',
	};
}

function dependencies(): IdentityDeletionCleanupDependencies {
	return {
		findSalesforceContactIds: jest.fn().mockResolvedValue([]),
		clearSalesforceContactIds: jest.fn().mockResolvedValue(0),
		findZuoraAccountIds: jest.fn().mockResolvedValue([]),
		clearZuoraAccountIds: jest.fn().mockResolvedValue(0),
	};
}

describe('handleIdentityDeletionEvent', () => {
	it('processes a valid Identity deletion event', async () => {
		const deps = dependencies();
		const dependenciesFactory = jest.fn().mockResolvedValue(deps);
		const event: SQSEvent = {
			Records: [
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({
						userId: 'deleted-identity-id',
						eventType: 'DELETE',
					}),
				}),
			],
		};

		await handleIdentityDeletionEvent(event, dependenciesFactory);

		expect(deps.findSalesforceContactIds).toHaveBeenCalledWith(
			'deleted-identity-id',
		);
		expect(deps.findZuoraAccountIds).toHaveBeenCalledWith(
			'deleted-identity-id',
		);
	});

	it('does not initialise downstream clients for a subscription confirmation', async () => {
		const dependenciesFactory = jest.fn();
		const event: SQSEvent = {
			Records: [sqsRecord({ Type: 'SubscriptionConfirmation' })],
		};

		await handleIdentityDeletionEvent(event, dependenciesFactory);

		expect(dependenciesFactory).not.toHaveBeenCalled();
	});

	it('rejects malformed messages so SQS can retry and then use the DLQ', async () => {
		const dependenciesFactory = jest.fn();
		const event: SQSEvent = {
			Records: [
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({}),
				}),
			],
		};

		await expect(
			handleIdentityDeletionEvent(event, dependenciesFactory),
		).rejects.toThrow();
		expect(dependenciesFactory).not.toHaveBeenCalled();
	});

	it('rejects downstream failures so the message is retried', async () => {
		const deps = dependencies();
		deps.findZuoraAccountIds = jest
			.fn()
			.mockRejectedValue(new Error('Zuora unavailable'));
		const event: SQSEvent = {
			Records: [
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({
						userId: 'deleted-identity-id',
						eventType: 'DELETE',
					}),
				}),
			],
		};

		await expect(
			handleIdentityDeletionEvent(event, jest.fn().mockResolvedValue(deps)),
		).rejects.toThrow('Zuora unavailable');
	});
});
