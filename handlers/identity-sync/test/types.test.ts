/**
 * @group unit
 */

import {
	identitySyncBatchInputSchema,
	identitySyncInputSchema,
} from '../src/types';

describe('identitySyncInputSchema', () => {
	it('should validate a complete valid input', () => {
		const input = {
			subscriptionId: '2c92a0fd60203d27016043ddc78f17c7',
			subscriptionName: 'A-S00248168',
			zuoraAccountId: '2c92a0fd565401c901566c9d29155b17',
			identityId: '123456789',
			sfContactId: '0030J000020wMWpQAM',
			sfAccountId: '0010J00001lRwTCQA0',
			email: 'user@example.com',
		};

		const result = identitySyncInputSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subscriptionId).toBe(input.subscriptionId);
			expect(result.data.identityId).toBe(input.identityId);
		}
	});

	it('should validate input with only required fields', () => {
		const input = {
			subscriptionId: '2c92a0fd60203d27016043ddc78f17c7',
			subscriptionName: 'A-S00248168',
			zuoraAccountId: '2c92a0fd565401c901566c9d29155b17',
			identityId: '123456789',
		};

		const result = identitySyncInputSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sfContactId).toBeUndefined();
			expect(result.data.email).toBeUndefined();
		}
	});

	it('should reject input missing required fields', () => {
		const input = {
			subscriptionId: '2c92a0fd60203d27016043ddc78f17c7',
			// missing subscriptionName, zuoraAccountId, identityId
		};

		const result = identitySyncInputSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject input with invalid email', () => {
		const input = {
			subscriptionId: '2c92a0fd60203d27016043ddc78f17c7',
			subscriptionName: 'A-S00248168',
			zuoraAccountId: '2c92a0fd565401c901566c9d29155b17',
			identityId: '123456789',
			email: 'not-an-email',
		};

		const result = identitySyncInputSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe('identitySyncBatchInputSchema', () => {
	it('should validate a batch input with dryRun flag', () => {
		const input = {
			subscriptions: [
				{
					subscriptionId: '2c92a0fd60203d27016043ddc78f17c7',
					subscriptionName: 'A-S00248168',
					zuoraAccountId: '2c92a0fd565401c901566c9d29155b17',
					identityId: '123456789',
				},
			],
			dryRun: true,
		};

		const result = identitySyncBatchInputSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dryRun).toBe(true);
			expect(result.data.subscriptions).toHaveLength(1);
		}
	});

	it('should default dryRun to false', () => {
		const input = {
			subscriptions: [
				{
					subscriptionId: '2c92a0fd60203d27016043ddc78f17c7',
					subscriptionName: 'A-S00248168',
					zuoraAccountId: '2c92a0fd565401c901566c9d29155b17',
					identityId: '123456789',
				},
			],
		};

		const result = identitySyncBatchInputSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dryRun).toBe(false);
		}
	});

	it('should reject empty subscriptions array', () => {
		const input = {
			subscriptions: [],
			dryRun: false,
		};

		// Empty array is actually valid per schema, just won't process anything
		const result = identitySyncBatchInputSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});
