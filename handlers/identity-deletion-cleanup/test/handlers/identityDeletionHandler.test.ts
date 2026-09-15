import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { handleIdentityDeletionEvent } from '../../src/handlers/identityDeletionHandler';
import type { IdentityDeletionCleanupDependencies } from '../../src/types/identityDeletionCleanup';

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
						userId: '1234567',
						eventType: 'DELETE',
					}),
				}),
			],
		};

		await handleIdentityDeletionEvent(event, dependenciesFactory);

		expect(deps.findSalesforceContactIds).toHaveBeenCalledWith('1234567');
		expect(deps.findZuoraAccountIds).toHaveBeenCalledWith('1234567');
	});

	it('rejects a non-numeric Identity ID so SQS can retry and then use the DLQ', async () => {
		const dependenciesFactory = jest.fn();
		const event: SQSEvent = {
			Records: [
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({
						userId: 'not-an-identity-id',
						eventType: 'DELETE',
					}),
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
						userId: '1234567',
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
