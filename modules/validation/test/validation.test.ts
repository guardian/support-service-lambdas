import { z } from 'zod';
import { validateInput, validateInputSafe } from '../src/index';

describe('Validation Module', () => {
	const SimpleSchema = z.object({
		name: z.string(),
		age: z.number(),
	});

	const validData = { name: 'John', age: 30 };

	describe('validateInput (throwing)', () => {
		test('validateInput should return parsed data for valid input', () => {
			const result = validateInput(validData, SimpleSchema);
			expect(result).toEqual(validData);
			expect(result.name).toBe('John');
			expect(result.age).toBe(30);
		});

		test('validateInput should throw error for invalid input', () => {
			const invalidData = { name: 'John' }; // missing age
			expect(() => {
				validateInput(invalidData, SimpleSchema);
			}).toThrow('Input validation failed');
		});

		test('validateInput should throw custom error message when provided', () => {
			const customMessage = 'Custom validation error for test';
			const invalidData = { name: 'John' }; // missing age
			expect(() => {
				validateInput(invalidData, SimpleSchema, customMessage);
			}).toThrow(customMessage);
		});

		test('validateInput should handle null input', () => {
			expect(() => {
				validateInput(null, SimpleSchema);
			}).toThrow('Input validation failed');
		});

		test('validateInput should handle undefined input', () => {
			expect(() => {
				validateInput(undefined, SimpleSchema);
			}).toThrow('Input validation failed');
		});

		test('validateInput should handle empty object', () => {
			expect(() => {
				validateInput({}, SimpleSchema);
			}).toThrow('Input validation failed');
		});

		test('validateInput should handle wrong type fields', () => {
			const invalidData = { name: 123, age: 'thirty' }; // wrong types
			expect(() => {
				validateInput(invalidData, SimpleSchema);
			}).toThrow('Input validation failed');
		});
	});

	describe('validateInputSafe (non-throwing)', () => {
		test('validateInputSafe should return success result for valid input', () => {
			const result = validateInputSafe(validData, SimpleSchema);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validData);
				expect(result.data.name).toBe('John');
				expect(result.data.age).toBe(30);
			}
		});

		test('validateInputSafe should return error result for invalid input', () => {
			const invalidData = { name: 'John' }; // missing age
			const result = validateInputSafe(invalidData, SimpleSchema);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Input validation failed');
				expect(result.error).toContain('Required'); // Zod's required field error
			}
		});

		test('validateInputSafe should not throw error but return error result', () => {
			const invalidData = { name: 'John' }; // missing age
			expect(() => {
				const result = validateInputSafe(invalidData, SimpleSchema);
				expect(result.success).toBe(false);
			}).not.toThrow();
		});

		test('validateInputSafe should handle null input gracefully', () => {
			const result = validateInputSafe(null, SimpleSchema);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Input validation failed');
			}
		});

		test('validateInputSafe should handle undefined input gracefully', () => {
			const result = validateInputSafe(undefined, SimpleSchema);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Input validation failed');
			}
		});

		test('validateInputSafe should handle empty object gracefully', () => {
			const result = validateInputSafe({}, SimpleSchema);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Input validation failed');
			}
		});
	});

	describe('Complex Schema Validation', () => {
		const ComplexSchema = z.object({
			id: z.string().uuid(),
			email: z.string().email(),
			settings: z.object({
				notifications: z.boolean(),
				theme: z.enum(['light', 'dark']),
			}),
			tags: z.array(z.string()).optional(),
			createdAt: z.string().datetime(),
		});

		const validComplexData = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			email: 'test@example.com',
			settings: {
				notifications: true,
				theme: 'dark' as const,
			},
			tags: ['user', 'active'],
			createdAt: '2023-01-01T00:00:00.000Z',
		};

		test('should validate complex nested object successfully', () => {
			const result = validateInput(validComplexData, ComplexSchema);
			expect(result).toEqual(validComplexData);
			expect(result.id).toBe(validComplexData.id);
			expect(result.email).toBe(validComplexData.email);
			expect(result.settings.theme).toBe('dark');
		});		test('should validate complex object with optional field missing', () => {
			const { tags, ...dataWithoutOptional } = validComplexData;
			
			const result = validateInput(dataWithoutOptional, ComplexSchema);
			expect(result.tags).toBeUndefined();
		});

		test('should fail validation for invalid email', () => {
			const invalidData = { ...validComplexData, email: 'invalid-email' };

			expect(() => {
				validateInput(invalidData, ComplexSchema);
			}).toThrow('Input validation failed');
		});

		test('should fail validation for invalid UUID', () => {
			const invalidData = { ...validComplexData, id: 'not-a-uuid' };

			expect(() => {
				validateInput(invalidData, ComplexSchema);
			}).toThrow('Input validation failed');
		});

		test('should fail validation for invalid enum value', () => {
			const invalidData = {
				...validComplexData,
				settings: { ...validComplexData.settings, theme: 'blue' as any },
			};

			expect(() => {
				validateInput(invalidData, ComplexSchema);
			}).toThrow('Input validation failed');
		});
	});

	describe('Array Schema Validation', () => {
		const ArraySchema = z.array(
			z.object({
				name: z.string(),
				value: z.number(),
			})
		);

		test('should validate array of objects', () => {
			const arrayData = [
				{ name: 'first', value: 1 },
				{ name: 'second', value: 2 },
			];

			const result = validateInput(arrayData, ArraySchema);
			expect(result).toEqual(arrayData);
			expect(result).toHaveLength(2);
		});

		test('should validate empty array', () => {
			const result = validateInput([], ArraySchema);
			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
		});

		test('should fail validation for invalid array item', () => {
			const invalidArrayData = [
				{ name: 'first', value: 1 },
				{ name: 'second' }, // missing value
			];

			expect(() => {
				validateInput(invalidArrayData, ArraySchema);
			}).toThrow('Input validation failed');
		});
	});

	describe('String Schema Validation', () => {
		const StringSchema = z.string().min(3).max(50);

		test('should validate valid string', () => {
			const result = validateInput('hello world', StringSchema);
			expect(result).toBe('hello world');
		});

		test('should fail for string too short', () => {
			expect(() => {
				validateInput('hi', StringSchema);
			}).toThrow('Input validation failed');
		});

		test('should fail for string too long', () => {
			const longString = 'a'.repeat(51);
			expect(() => {
				validateInput(longString, StringSchema);
			}).toThrow('Input validation failed');
		});

		test('should fail for non-string input', () => {
			expect(() => {
				validateInput(123, StringSchema);
			}).toThrow('Input validation failed');
		});
	});

	describe('Transform and Default Values', () => {
		const TransformSchema = z.object({
			name: z.string().transform((name) => name.trim().toLowerCase()),
			count: z.number().default(0),
			isActive: z.boolean().default(true),
		});

		test('should apply transformations', () => {
			const inputData = { name: '  JOHN DOE  ', count: 5, isActive: false };
			const result = validateInput(inputData, TransformSchema);

			expect(result.name).toBe('john doe');
			expect(result.count).toBe(5);
			expect(result.isActive).toBe(false);
		});

		test('should apply default values', () => {
			const inputData = { name: 'john' };
			const result = validateInput(inputData, TransformSchema);

			expect(result.name).toBe('john');
			expect(result.count).toBe(0);
			expect(result.isActive).toBe(true);
		});
	});

	describe('Type Safety', () => {
		test('should maintain type safety for return values', () => {
			const UserSchema = z.object({
				username: z.string(),
				age: z.number(),
				isAdmin: z.boolean(),
			});

			const userData = { username: 'testuser', age: 25, isAdmin: false };
			const result = validateInput(userData, UserSchema);

			// TypeScript should infer the correct types
			expect(typeof result.username).toBe('string');
			expect(typeof result.age).toBe('number');
			expect(typeof result.isAdmin).toBe('boolean');

			// These should work without type errors
			const uppercased = result.username.toUpperCase();
			const doubled = result.age * 2;
			const negated = !result.isAdmin;

			expect(uppercased).toBe('TESTUSER');
			expect(doubled).toBe(50);
			expect(negated).toBe(true);
		});

		test('should maintain type safety for safe validation', () => {
			const ProductSchema = z.object({
				id: z.string(),
				price: z.number(),
				inStock: z.boolean(),
			});

			const productData = { id: 'abc123', price: 29.99, inStock: true };
			const result = validateInputSafe(productData, ProductSchema);

			if (result.success) {
				// TypeScript should know this is the success case
				expect(typeof result.data.id).toBe('string');
				expect(typeof result.data.price).toBe('number');
				expect(typeof result.data.inStock).toBe('boolean');
			} else {
				// TypeScript should know this is the error case
				expect(typeof result.error).toBe('string');
			}
		});
	});
});
