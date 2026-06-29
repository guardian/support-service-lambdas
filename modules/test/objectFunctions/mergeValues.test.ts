import { mergeValues, pickKeys } from '../../objectFunctions';

describe('mergeValues', () => {
	test('merges object fragment values into a single object', () => {
		const fragments = {
			foo: { name: 'Alice' },
			bar: { age: 30 },
		};
		expect(mergeValues(fragments)).toEqual({ name: 'Alice', age: 30 });
	});

	test('later fragments overwrite earlier ones for duplicate keys', () => {
		const fragments = {
			a: { x: 1 },
			b: { x: 2 },
		};
		expect(mergeValues(fragments)).toEqual({ x: 2 });
	});

	test('returns empty object when given an empty object', () => {
		expect(mergeValues({})).toEqual({});
	});

	test('works correctly when composed with pickKeys', () => {
		const expandRegistry = {
			subscriptions: { subscriptions: [{ id: 'sub1' }] },
			invoices: { invoices: [{ id: 'inv1' }] },
			payments: { payments: [{ id: 'pay1' }] },
		};
		const result = mergeValues(
			pickKeys(expandRegistry, ['subscriptions', 'invoices']),
		);
		expect(result).toEqual({
			subscriptions: [{ id: 'sub1' }],
			invoices: [{ id: 'inv1' }],
		});
		expect(result).not.toHaveProperty('payments');
	});
});

