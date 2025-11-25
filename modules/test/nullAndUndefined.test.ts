import { getIfDefinedAndValid } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';

describe('nullAndUndefined module', () => {
	describe('getIfDefinedAndValid', () => {
		const predicate = (v: unknown): v is Stage => v === 'PROD' || v === 'CODE';
		it('returns the value when it is defined and satisfies the predicate', () => {
			const value = 'PROD';
			const result = getIfDefinedAndValid(
				'PROD',
				predicate,
				'Value is not defined or not a valid Stage',
			);
			expect(result).toBe(value);
		});

		it('throws ReferenceError when the value is undefined', () => {
			expect(() =>
				getIfDefinedAndValid(
					undefined,
					predicate,
					'Value is not defined or not a valid Stage',
				),
			).toThrow(ReferenceError);
		});

		it('throws ReferenceError when the value does not satisfy the predicate', () => {
			expect(() =>
				getIfDefinedAndValid(
					'INVALID_STAGE',
					predicate,
					'Value is not defined or not a valid Stage',
				),
			).toThrow(ReferenceError);
		});
	});
});
