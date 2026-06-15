import { pickKeys } from '../../objectFunctions';

describe('pickKeys', () => {
	test('returns only the specified keys with their values', () => {
		const obj = { a: 1, b: 'hello', c: true };
		expect(pickKeys(obj, ['a', 'c'])).toEqual({ a: 1, c: true });
	});

	test('preserves per-key value types', () => {
		const obj = { x: 42, y: 'world' };
		const result = pickKeys(obj, ['x']);
		// type check: result.x should be number
		const n: number = result.x;
		expect(n).toBe(42);
	});

	test('returns empty object when no keys are selected', () => {
		const obj = { a: 1, b: 2 };
		expect(pickKeys(obj, [])).toEqual({});
	});

	test('returns all keys when all are selected', () => {
		const obj = { a: 1, b: 2 };
		expect(pickKeys(obj, ['a', 'b'])).toEqual({ a: 1, b: 2 });
	});
});

