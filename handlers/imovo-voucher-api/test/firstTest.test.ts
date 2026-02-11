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
			VoucherCode: 'ABC-123',
			ExpiryDate: '2026-12-31',
			VoucherValue: '5.00',
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(response);
		}
	});

	it('parses a valid response without optional VoucherValue', () => {
		const response = {
			VoucherCode: 'ABC-123',
			ExpiryDate: '2026-12-31',
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.VoucherCode).toBe('ABC-123');
			expect(result.data.ExpiryDate).toBe('2026-12-31');
			expect(result.data.VoucherValue).toBeUndefined();
		}
	});

	it('rejects a response missing VoucherCode', () => {
		const response = {
			ExpiryDate: '2026-12-31',
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(false);
	});

	it('rejects a response missing ExpiryDate', () => {
		const response = {
			VoucherCode: 'ABC-123',
		};

		const result = imovoVoucherResponseSchema.safeParse(response);
		expect(result.success).toBe(false);
	});
});
