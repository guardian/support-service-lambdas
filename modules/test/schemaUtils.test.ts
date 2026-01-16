import { z } from 'zod';
import { optionalDropNulls } from '../schemaUtils';

describe('optionalDropNulls', () => {
	it('should remove null values from object', () => {
		const schema = z.object({
			name: z.string(),
			age: optionalDropNulls(z.number()),
			height: optionalDropNulls(z.number()),
			email: optionalDropNulls(z.string()),
			address: z
				.object({
					street: optionalDropNulls(z.string()),
					city: z.string(),
				})
				.nullable(),
		});

		const input = {
			name: 'John',
			age: null,
			// height undefined
			email: 'john@example.com',
			address: {
				street: null,
				city: 'London',
			},
		};

		const result = optionalDropNulls(schema).parse(input);

		expect(result).toEqual({
			name: 'John',
			email: 'john@example.com',
			address: {
				city: 'London',
			},
		});
	});
});
