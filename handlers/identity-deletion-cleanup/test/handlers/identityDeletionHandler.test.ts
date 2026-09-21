import type { SQSRecord } from 'aws-lambda';
import { handleIdentityDeletionRecord } from '../../src/handlers/identityDeletionHandler';
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

describe('handleIdentityDeletionRecord', () => {
	it('processes a valid Identity deletion event', async () => {
		const deps = dependencies();

		await handleIdentityDeletionRecord(
			sqsRecord({
				Type: 'Notification',
				Message: JSON.stringify({
					userId: '1234567',
					eventType: 'DELETE',
				}),
			}),
			{ dependencies: Promise.resolve(deps) },
		);

		expect(deps.findSalesforceContactIds).toHaveBeenCalledWith('1234567');
		expect(deps.findZuoraAccountIds).toHaveBeenCalledWith('1234567');
	});

	it('rejects a non-numeric Identity ID so SQS can retry and then use the DLQ', async () => {
		const deps = dependencies();

		await expect(
			handleIdentityDeletionRecord(
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({
						userId: 'not-an-identity-id',
						eventType: 'DELETE',
					}),
				}),
				{ dependencies: Promise.resolve(deps) },
			),
		).rejects.toThrow();
		expect(deps.findSalesforceContactIds).not.toHaveBeenCalled();
	});

	it('rejects a non-deletion event so SQS can retry and then use the DLQ', async () => {
		const deps = dependencies();

		await expect(
			handleIdentityDeletionRecord(
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({
						userId: '1234567',
						eventType: 'CREATE',
					}),
				}),
				{ dependencies: Promise.resolve(deps) },
			),
		).rejects.toThrow();
		expect(deps.findSalesforceContactIds).not.toHaveBeenCalled();
	});

	it('rejects downstream failures so the message is retried', async () => {
		const deps = dependencies();
		deps.findZuoraAccountIds = jest
			.fn()
			.mockRejectedValue(new Error('Zuora unavailable'));
		await expect(
			handleIdentityDeletionRecord(
				sqsRecord({
					Type: 'Notification',
					Message: JSON.stringify({
						userId: '1234567',
						eventType: 'DELETE',
					}),
				}),
				{ dependencies: Promise.resolve(deps) },
			),
		).rejects.toThrow('Zuora unavailable');
	});
});
