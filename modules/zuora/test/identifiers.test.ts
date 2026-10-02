import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';

describe('identifiers', () => {
	describe('subscriptionNumberSchema', () => {
		it('accepts an alphanumeric number with hyphens', () => {
			expect(subscriptionNumberSchema.parse('A-S00001234')).toEqual(
				'A-S00001234',
			);
		});

		it('accepts a number not starting with A-S', () => {
			expect(subscriptionNumberSchema.parse('X1234567')).toEqual('X1234567');
		});

		it('rejects a number with whitespace', () => {
			expect(() => subscriptionNumberSchema.parse('A-S 1234')).toThrow();
		});

		it('rejects a number with other special characters', () => {
			expect(() => subscriptionNumberSchema.parse('A-S1234_5')).toThrow();
		});
	});

	describe('orderNumberSchema', () => {
		it('accepts an alphanumeric number with hyphens', () => {
			expect(orderNumberSchema.parse('O-00005678')).toEqual('O-00005678');
		});

		it('rejects an empty string', () => {
			expect(() => orderNumberSchema.parse('')).toThrow();
		});
	});
});
