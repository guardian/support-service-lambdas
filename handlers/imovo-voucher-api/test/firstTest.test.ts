import {
	imovoVoucherResponseSchema,
	sqsMessageSchema,
} from '../src/domain/schemas';

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

	it('rejects a message with empty voucherType', () => {
		const message = {
			email: 'test@example.com',
			identityId: '12345',
			voucherType: '',
		};

		const result = sqsMessageSchema.safeParse(message);
		expect(result.success).toBe(false);
	});
});

describe('i-movo voucher response schema', () => {
	it('parses a valid response with all fields', () => {
		const response = {
			voucherCode: 'ABC-123',
			expiryDate: '2026-12-31',
			balance: 5.0,
			message: 'Success',
			successfulRequest: true,
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(response);
		}
	});

	it('parses a valid response without optional fields', () => {
		const response = {
			voucherCode: 'ABC-123',
			expiryDate: '2026-12-31',
			successfulRequest: true,
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.voucherCode).toBe('ABC-123');
			expect(result.data.expiryDate).toBe('2026-12-31');
			expect(result.data.balance).toBeUndefined();
			expect(result.data.message).toBeUndefined();
		}
	});

	it('rejects a response missing voucherCode', () => {
		const response = {
			expiryDate: '2026-12-31',
			successfulRequest: true,
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(false);
	});

	it('rejects a response missing expiryDate', () => {
		const response = {
			voucherCode: 'ABC-123',
			successfulRequest: true,
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(false);
	});

	it('rejects a response missing successfulRequest', () => {
		const response = {
			voucherCode: 'ABC-123',
			expiryDate: '2026-12-31',
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(false);
	});
});
