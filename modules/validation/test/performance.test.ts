import { z } from 'zod';
import { validateInput, validateInputSafe } from '../src/index';

describe('Validation Module Performance', () => {
	const SimpleSchema = z.object({
		name: z.string(),
		age: z.number(),
		email: z.string().email(),
	});

	const complexSchema = z.object({
		id: z.string().uuid(),
		user: z.object({
			name: z.string().min(2).max(50),
			email: z.string().email(),
			age: z.number().min(0).max(120),
			preferences: z.object({
				theme: z.enum(['light', 'dark']),
				notifications: z.boolean(),
				language: z.string().default('en'),
			}),
		}),
		metadata: z.array(z.object({
			key: z.string(),
			value: z.union([z.string(), z.number(), z.boolean()]),
		})),
		timestamps: z.object({
			createdAt: z.string().datetime(),
			updatedAt: z.string().datetime(),
		}),
	});

	const validData = {
		name: 'John Doe',
		age: 30,
		email: 'john@example.com',
	};

	const complexValidData = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		user: {
			name: 'John Doe',
			email: 'john@example.com',
			age: 30,
			preferences: {
				theme: 'dark' as const,
				notifications: true,
				language: 'en',
			},
		},
		metadata: [
			{ key: 'source', value: 'web' },
			{ key: 'version', value: 1 },
			{ key: 'active', value: true },
		],
		timestamps: {
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
		},
	};

	test('validateInput should handle many simple validations efficiently', () => {
		const iterations = 1000;
		const startTime = Date.now();

		for (let i = 0; i < iterations; i++) {
			validateInput(validData, SimpleSchema);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;
		
		// Should complete 1000 validations in under 100ms
		expect(duration).toBeLessThan(100);
	});

	test('validateInputSafe should handle many simple validations efficiently', () => {
		const iterations = 1000;
		const startTime = Date.now();

		for (let i = 0; i < iterations; i++) {
			validateInputSafe(validData, SimpleSchema);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;
		
		// Should complete 1000 validations in under 100ms
		expect(duration).toBeLessThan(100);
	});

	test('validateInput should handle complex schema validations efficiently', () => {
		const iterations = 100;
		const startTime = Date.now();

		for (let i = 0; i < iterations; i++) {
			validateInput(complexValidData, complexSchema);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;
		
		// Should complete 100 complex validations in under 100ms
		expect(duration).toBeLessThan(100);
	});

	test('validateInputSafe should handle complex schema validations efficiently', () => {
		const iterations = 100;
		const startTime = Date.now();

		for (let i = 0; i < iterations; i++) {
			validateInputSafe(complexValidData, complexSchema);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;
		
		// Should complete 100 complex validations in under 100ms
		expect(duration).toBeLessThan(100);
	});

	test('error handling should not significantly impact performance', () => {
		const invalidData = { name: 'John' }; // missing required fields
		const iterations = 500;
		const startTime = Date.now();

		for (let i = 0; i < iterations; i++) {
			const result = validateInputSafe(invalidData, SimpleSchema);
			expect(result.success).toBe(false);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;
		
		// Should complete 500 error validations in under 100ms
		expect(duration).toBeLessThan(100);
	});

	test('memory usage should be stable across many validations', () => {
		// Test for memory leaks by running many validations
		const iterations = 10000;
		const results: any[] = [];

		for (let i = 0; i < iterations; i++) {
			const result = validateInputSafe(validData, SimpleSchema);
			if (i % 1000 === 0) {
				results.push(result);
			}
		}

		// Verify that all sampled results are valid
		results.forEach(result => {
			expect(result.success).toBe(true);
		});

		// If we got here without running out of memory, the test passes
		expect(results).toHaveLength(10);
	});
});
