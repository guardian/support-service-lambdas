import { chunk } from '../../src/helpers';

describe('chunk', () => {
	it('splits items into batches of the requested size', () => {
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('returns no batches for no items', () => {
		expect(chunk([], 2)).toEqual([]);
	});
});
