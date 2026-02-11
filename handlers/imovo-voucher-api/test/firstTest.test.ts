import { sqsMessageSchema } from '../src/schemas';

describe('SQS message schema', () => {
	it('parses a valid message', () => {
		const message = {
			email: 'test@example.com',
			identityId: '12345',
			voucherType: 'DIGITAL_REWARD',
		};

		const result = sqsMessageSchema.safeParse(message);
		expect(result.success).toBe(true);
	});

	it('rejects a message with missing fields', () => {
		const message = {
			email: 'test@example.com',
		};

		const result = sqsMessageSchema.safeParse(message);
		expect(result.success).toBe(false);
	});

	it('rejects a message with invalid email', () => {
		const message = {
			email: 'not-an-email',
			identityId: '12345',
			voucherType: 'DIGITAL_REWARD',
		};

		const result = sqsMessageSchema.safeParse(message);
		expect(result.success).toBe(false);
	});

	it('rejects a message with empty identityId', () => {
		const message = {
			email: 'test@example.com',
			identityId: '',
			voucherType: 'DIGITAL_REWARD',
		};

		const result = sqsMessageSchema.safeParse(message);
		expect(result.success).toBe(false);
	});
});
