import {
	zuoraErrorSchema,
	zuoraSuccessSchema,
} from '@modules/zuora/types/httpResponse';

describe('Schema validation for HTTP responses', () => {
	test('should validate successful lower case response', async () => {
		expect(
			zuoraSuccessSchema.safeParse({
				success: true,
			}).success,
		).toBe(true);
	});
	test('should validate successful upper case response', async () => {
		expect(
			zuoraSuccessSchema.safeParse({
				Success: true,
			}).success,
		).toBe(true);
	});
	test('should detect a lower case error response', () => {
		const errorResponse = {
			success: false,
			reasons: [
				{
					code: '90000011',
					message: 'Authentication error',
				},
			],
		};
		expect(zuoraSuccessSchema.safeParse(errorResponse).success).toBe(false);
		expect(zuoraErrorSchema.safeParse(errorResponse).success).toBe(true);
	});
	test('should detect an upper case error response', () => {
		const errorResponse = {
			Errors: [
				{
					Message:
						'You cannot transfer an amount greater than the invoice balance. Please update and try again.',
					Code: 'INVALID_VALUE',
				},
			],
			Success: false,
		};
		expect(zuoraSuccessSchema.safeParse(errorResponse).success).toBe(false);
		expect(zuoraErrorSchema.safeParse(errorResponse).success).toBe(true);
	});
	test('should detect a fault code error response', () => {
		const errorResponse = {
			FaultCode: 'INVALID_FIELD',
			FaultMessage: 'invalid field for query: Invoice.accountid1',
		};
		expect(zuoraSuccessSchema.safeParse(errorResponse).success).toBe(false);
		expect(zuoraErrorSchema.safeParse(errorResponse).success).toBe(true);
	});
	test('should detect a code error response', () => {
		const errorResponse = {
			code: 'ClientError',
			message: "Invalid action 'query1'",
		};
		expect(zuoraSuccessSchema.safeParse(errorResponse).success).toBe(false);
		expect(zuoraErrorSchema.safeParse(errorResponse).success).toBe(true);
	});
});
