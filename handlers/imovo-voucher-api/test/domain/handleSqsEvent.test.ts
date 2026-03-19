import type { SQSEvent } from 'aws-lambda';
import { handleSqsEvent } from '../../src/domain/handleSqsEvent';
import type { Dependencies } from '../../src/domain/ports';
import type { VoucherRecord } from '../../src/domain/schemas';

function buildSqsEvent(...bodies: unknown[]): SQSEvent {
	return {
		Records: bodies.map((body, i) => ({
			messageId: `msg-${i}`,
			receiptHandle: `receipt-${i}`,
			body: JSON.stringify(body),
			attributes: {
				ApproximateReceiveCount: '1',
				SentTimestamp: '0',
				SenderId: 'test',
				ApproximateFirstReceiveTimestamp: '0',
			},
			messageAttributes: {},
			md5OfBody: '',
			eventSource: 'aws:sqs',
			eventSourceARN: 'arn:aws:sqs:eu-west-1:000:test',
			awsRegion: 'eu-west-1',
		})),
	};
}

function buildFakeDeps(): Dependencies & {
	savedRecords: VoucherRecord[];
	emailedRecords: VoucherRecord[];
} {
	const savedRecords: VoucherRecord[] = [];
	const emailedRecords: VoucherRecord[] = [];
	return {
		savedRecords,
		emailedRecords,
		voucherProvider: {
			requestVoucher: () =>
				Promise.resolve({
					voucherCode: 'FAKE-CODE',
					expiryDate: '2026-12-31',
					successfulRequest: true,
				}),
		},
		voucherRepository: {
			save: (record) => {
				savedRecords.push(record);
				return Promise.resolve();
			},
		},
		emailSender: {
			sendVoucherConfirmation: (record) => {
				emailedRecords.push(record);
				return Promise.resolve();
			},
		},
	};
}

describe('handleSqsEvent', () => {
	it('processes a single valid SQS record', async () => {
		const event = buildSqsEvent({
			email: 'user@example.com',
			identityId: 'id-1',
			voucherType: 'REWARD',
		});
		const deps = buildFakeDeps();

		await handleSqsEvent(event, deps);

		expect(deps.savedRecords).toHaveLength(1);
		expect(deps.savedRecords[0]?.voucherCode).toBe('FAKE-CODE');
		expect(deps.savedRecords[0]?.identityId).toBe('id-1');
	});

	it('processes multiple SQS records in order', async () => {
		const event = buildSqsEvent(
			{ email: 'a@example.com', identityId: 'id-a', voucherType: 'TYPE_A' },
			{ email: 'b@example.com', identityId: 'id-b', voucherType: 'TYPE_B' },
		);
		const deps = buildFakeDeps();

		await handleSqsEvent(event, deps);

		expect(deps.savedRecords).toHaveLength(2);
		expect(deps.savedRecords[0]?.identityId).toBe('id-a');
		expect(deps.savedRecords[1]?.identityId).toBe('id-b');
	});

	it('sends confirmation email after successful processing', async () => {
		const event = buildSqsEvent({
			email: 'user@example.com',
			identityId: 'id-1',
			voucherType: 'REWARD',
		});
		const deps = buildFakeDeps();

		await handleSqsEvent(event, deps);

		expect(deps.emailedRecords).toHaveLength(1);
		expect(deps.emailedRecords[0]?.voucherCode).toBe('FAKE-CODE');
		expect(deps.emailedRecords[0]?.identityId).toBe('id-1');
	});

	it('skips SNS SubscriptionConfirmation messages', async () => {
		const subscriptionConfirmation = {
			Type: 'SubscriptionConfirmation',
			MessageId: 'sns-confirm-1',
			TopicArn: 'arn:aws:sns:eu-west-1:942464564246:PrintPromoTopic',
			Message: 'You have chosen to subscribe to the topic...',
			SubscribeURL:
				'https://sns.eu-west-1.amazonaws.com/?Action=ConfirmSubscription...',
			Token: 'some-token',
			Timestamp: '2026-01-01T00:00:00.000Z',
		};
		const event = buildSqsEvent(subscriptionConfirmation);
		const deps = buildFakeDeps();

		await handleSqsEvent(event, deps);

		expect(deps.savedRecords).toHaveLength(0);
		expect(deps.emailedRecords).toHaveLength(0);
	});

	it('processes a message wrapped in an SNS envelope', async () => {
		const snsWrappedBody = {
			Type: 'Notification',
			MessageId: 'sns-msg-1',
			TopicArn: 'arn:aws:sns:eu-west-1:942464564246:PrintPromoTopic',
			Message: JSON.stringify({
				email: 'sns-user@example.com',
				identityId: 'id-sns',
				voucherType: 'registration-reward',
			}),
			Timestamp: '2026-01-01T00:00:00.000Z',
		};
		const event = buildSqsEvent(snsWrappedBody);
		const deps = buildFakeDeps();

		await handleSqsEvent(event, deps);

		expect(deps.savedRecords).toHaveLength(1);
		expect(deps.savedRecords[0]?.identityId).toBe('id-sns');
		expect(deps.savedRecords[0]?.voucherCode).toBe('FAKE-CODE');
		expect(deps.emailedRecords).toHaveLength(1);
	});

	it('throws on invalid SQS message body', async () => {
		const event = buildSqsEvent({ email: 'not-valid' });
		const deps = buildFakeDeps();

		await expect(handleSqsEvent(event, deps)).rejects.toThrow(
			'Invalid SQS message format',
		);
	});

	it('propagates provider errors without saving', async () => {
		const event = buildSqsEvent({
			email: 'user@example.com',
			identityId: 'id-1',
			voucherType: 'REWARD',
		});
		const deps = buildFakeDeps();
		deps.voucherProvider = {
			requestVoucher: () => Promise.reject(new Error('provider down')),
		};

		await expect(handleSqsEvent(event, deps)).rejects.toThrow('provider down');
		expect(deps.savedRecords).toHaveLength(0);
	});
});
