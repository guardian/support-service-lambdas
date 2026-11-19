import type { SQSRecord } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import type { AcquisitionEventBatch } from '../src/acquisitions';
import { processRecord, processRecords } from '../src/index';

const configuration = {
	googleEnhancedConversionsConversionActionId: '123456789',
};

const detail = {
	eventTimeStamp: '2026-09-15T10:20:30.123Z',
	product: 'SUPPORTER_PLUS',
	amount: null,
	country: 'GB',
	currency: 'GBP',
	abTests: [],
	paymentFrequency: 'ANNUALLY',
	printOptions: null,
	labels: [],
	reusedExistingPaymentMethod: false,
	readerType: 'Direct',
	acquisitionType: 'Purchase',
	queryParameters: [],
	platform: 'SUPPORT',
	similarProductsConsent: null,
};

const record = (body: string, messageId = 'message-id'): SQSRecord => ({
	messageId,
	receiptHandle: 'receipt-handle',
	body,
	attributes: {
		ApproximateReceiveCount: '1',
		SentTimestamp: '1',
		SenderId: 'sender',
		ApproximateFirstReceiveTimestamp: '1',
	},
	messageAttributes: {},
	md5OfBody: 'body-md5',
	eventSource: 'aws:sqs',
	eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789012:queue',
	awsRegion: 'eu-west-1',
});

type SendBatch = (batch: AcquisitionEventBatch) => Promise<void>;

describe('mParticle acquisition handler', () => {
	const errorSpy = jest
		.spyOn(logger, 'error')
		.mockImplementation(() => undefined);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('acknowledges a valid event after mParticle accepts it', async () => {
		const send = jest.fn<ReturnType<SendBatch>, Parameters<SendBatch>>();
		send.mockResolvedValue(undefined);

		const result = await processRecord(
			record(JSON.stringify({ detail })),
			configuration,
			'production',
			send,
		);

		expect(result).toEqual({ success: true });
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ environment: 'production' }),
		);
	});

	it('does not log consent snapshot values', async () => {
		const snapshot = {
			capturedAt: '2026-10-12T14:13:08.848Z',
			consentManagerVersion: 'synthetic-version',
			framework: 'tcfv2',
			gpcSignal: null,
			tcfv2: {
				gdprApplies: true,
				consents: { '7': true },
				vendorConsents: { '5ed0eb688a76503f1016578f': true },
				eventStatus: 'tcloaded',
				addtlConsent: 'synthetic-value',
			},
		};
		const logSpy = jest
			.spyOn(logger, 'log')
			.mockImplementation(() => undefined);
		const send = jest.fn<ReturnType<SendBatch>, Parameters<SendBatch>>();
		send.mockResolvedValue(undefined);

		await processRecord(
			record(
				JSON.stringify({ detail: { ...detail, cmpConsentSnapshot: snapshot } }),
			),
			configuration,
			'development',
			send,
		);

		const logs = JSON.stringify(logSpy.mock.calls);
		expect(logs).not.toContain(snapshot.capturedAt);
		expect(logs).not.toContain(snapshot.consentManagerVersion);
		expect(logs).not.toContain('synthetic-value');
		logSpy.mockRestore();
	});

	it('returns malformed JSON and schema failures as partial batch failures', async () => {
		const send = jest.fn<ReturnType<SendBatch>, Parameters<SendBatch>>();
		send.mockResolvedValue(undefined);
		const validRecord = record(JSON.stringify({ detail }), 'valid-record');

		const result = await processRecords(
			{
				Records: [
					record('{', 'bad-json'),
					record(
						JSON.stringify({ detail: { ...detail, currency: 42 } }),
						'bad-schema',
					),
					validRecord,
				],
			},
			configuration,
			'development',
			send,
		);

		expect(result).toEqual({
			batchItemFailures: [
				{ itemIdentifier: 'bad-json' },
				{ itemIdentifier: 'bad-schema' },
			],
		});
		expect(errorSpy).toHaveBeenCalledWith(
			'Failed to validate mParticle acquisition event',
			{
				messageId: 'bad-schema',
				validationIssues: [
					{
						path: ['detail', 'currency'],
						code: 'invalid_type',
						message: 'Invalid input: expected string, received number',
					},
				],
			},
		);
		expect(send).toHaveBeenCalledTimes(1);
		const sentBatch = send.mock.calls[0]?.[0];
		expect(sentBatch?.events[0]?.data.product_action.action).toBe('purchase');
	});

	it('returns an mParticle failure for retry instead of acknowledging the record', async () => {
		const send = jest.fn<ReturnType<SendBatch>, Parameters<SendBatch>>();
		send.mockRejectedValue(new Error('HTTP status 503'));

		const result = await processRecords(
			{ Records: [record(JSON.stringify({ detail }), 'failed-send')] },
			configuration,
			'development',
			send,
		);

		expect(result).toEqual({
			batchItemFailures: [{ itemIdentifier: 'failed-send' }],
		});
	});
});
