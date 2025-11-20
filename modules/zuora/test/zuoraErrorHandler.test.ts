import { ZuoraError } from '@modules/zuora/errors';
import { generateZuoraError } from '@modules/zuora/errors/zuoraErrorHandler';

describe('generateZuoraError', () => {
	it('parses lowerCaseZuoraErrorSchema format', () => {
		const errorMessage = 'Authentication error';
		const body = {
			success: false,
			reasons: [
				{
					code: '90000011',
					message: errorMessage,
				},
			],
		};
		const error = generateZuoraError(body);

		expect(error).toBeInstanceOf(ZuoraError);

		expect(error.message).toBe(errorMessage);
		expect(error.zuoraErrorDetails).toHaveLength(1);
	});

	it('parses upperCaseZuoraErrorSchema format', () => {
		const errorMessage =
			'You cannot transfer an amount greater than the invoice balance. Please update and try again.';
		const body = {
			Errors: [
				{
					Message: errorMessage,
					Code: 'INVALID_VALUE',
				},
			],
			Success: false,
		};
		const error = generateZuoraError(body);

		expect(error.message).toBe(errorMessage);
		expect(error.zuoraErrorDetails[0]?.code).toBe('INVALID_VALUE');
	});

	it('parses faultCodeAndMessageSchema format', () => {
		const errorMessage = 'invalid field for query: Invoice.accountid1';
		const body = {
			FaultCode: 'INVALID_FIELD',
			FaultMessage: errorMessage,
		};
		const error = generateZuoraError(body);

		expect(error.message).toBe(errorMessage);
		expect(error.zuoraErrorDetails[0]?.code).toBe('INVALID_FIELD');
	});

	it('parses codeAndMessageSchema format', () => {
		const errorMessage = "Invalid action 'query1'";
		const body = {
			code: 'ClientError',
			message: errorMessage,
		};
		const error = generateZuoraError(body);

		expect(error.message).toBe(errorMessage);
		expect(error.zuoraErrorDetails[0]?.code).toBe('ClientError');
	});

	it('returns default error if no schema matches', () => {
		const json = { unexpected: 'data' };
		const error = generateZuoraError(json);

		expect(error.message).toBe('Zuora API Error');
		expect(error.zuoraErrorDetails).toEqual([]);
	});
});
