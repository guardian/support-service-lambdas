import {
	listenDisputeClosedInputSchema,
	listenDisputeCreatedInputSchema,
	type ListenDisputeClosedRequestBody,
	type ListenDisputeCreatedRequestBody,
} from '../src/requestSchema';

describe('Request Schema Validation', () => {
	describe('listenDisputeCreatedInputSchema', () => {
		it('should validate valid input', () => {
			const validInput = {
				subscriptionNumber: 'A-S12345678',
			};

			const result = listenDisputeCreatedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
			expect(result.subscriptionNumber).toBe('A-S12345678');
		});

		it('should reject input without subscriptionNumber', () => {
			const invalidInput = {};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with non-string subscriptionNumber', () => {
			const invalidInput = {
				subscriptionNumber: 123,
			};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with null subscriptionNumber', () => {
			const invalidInput = {
				subscriptionNumber: null,
			};

			expect(() =>
				listenDisputeCreatedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with empty string subscriptionNumber', () => {
			const invalidInput = {
				subscriptionNumber: '',
			};

			const result = listenDisputeCreatedInputSchema.parse(invalidInput);
			expect(result.subscriptionNumber).toBe('');
		});

		it('should accept additional properties', () => {
			const inputWithExtra = {
				subscriptionNumber: 'A-S12345678',
				extraProperty: 'ignored',
			};

			const result = listenDisputeCreatedInputSchema.parse(inputWithExtra);

			expect(result.subscriptionNumber).toBe('A-S12345678');
			expect(result).not.toHaveProperty('extraProperty');
		});

		it('should match TypeScript type', () => {
			const validInput: ListenDisputeCreatedRequestBody = {
				subscriptionNumber: 'A-S12345678',
			};

			const result = listenDisputeCreatedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
		});
	});

	describe('listenDisputeClosedInputSchema', () => {
		it('should validate valid input', () => {
			const validInput = {
				subscriptionNumber: 'A-S87654321',
			};

			const result = listenDisputeClosedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
			expect(result.subscriptionNumber).toBe('A-S87654321');
		});

		it('should reject input without subscriptionNumber', () => {
			const invalidInput = {};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with non-string subscriptionNumber', () => {
			const invalidInput = {
				subscriptionNumber: 123,
			};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with null subscriptionNumber', () => {
			const invalidInput = {
				subscriptionNumber: null,
			};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should reject input with undefined subscriptionNumber', () => {
			const invalidInput = {
				subscriptionNumber: undefined,
			};

			expect(() =>
				listenDisputeClosedInputSchema.parse(invalidInput),
			).toThrow();
		});

		it('should accept additional properties', () => {
			const inputWithExtra = {
				subscriptionNumber: 'A-S87654321',
				extraProperty: 'ignored',
			};

			const result = listenDisputeClosedInputSchema.parse(inputWithExtra);

			expect(result.subscriptionNumber).toBe('A-S87654321');
			expect(result).not.toHaveProperty('extraProperty');
		});

		it('should match TypeScript type', () => {
			const validInput: ListenDisputeClosedRequestBody = {
				subscriptionNumber: 'A-S87654321',
			};

			const result = listenDisputeClosedInputSchema.parse(validInput);

			expect(result).toEqual(validInput);
		});
	});

	describe('Schema equivalence', () => {
		it('should have identical schema for both dispute types', () => {
			const testInput = { subscriptionNumber: 'A-S99999999' };

			const createdResult = listenDisputeCreatedInputSchema.parse(testInput);
			const closedResult = listenDisputeClosedInputSchema.parse(testInput);

			expect(createdResult).toEqual(closedResult);
		});
	});
});
