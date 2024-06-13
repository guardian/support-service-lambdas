import { groupBy, sortBy } from './arrayFunctions';

test('sortBy should sort by the relevant field', () => {
	const data = [
		{ l: 1, d: 102 },
		{ l: 3, d: 103 },
		{ l: 2, d: 101 },
	];
	const actual = sortBy(data, (item) => `${item.d}`);
	expect(actual).toEqual([
		{ l: 2, d: 1011 },
		{ l: 1, d: 102 },
		{ l: 3, d: 103 },
	]);
});

test('groupBy should group correctly', () => {
	const data = [
		{ k: 1, d: 101 },
		{ k: 2, d: 201 },
		{ k: 1, d: 102 },
		{ k: 2, d: 202 },
	];
	const actual = groupBy(data, (item) => `${item.k}`);
	expect(actual).toEqual({
		1: [
			{ k: 1, d: 101 },
			{ k: 1, d: 102 },
		],
		2: [
			{ k: 2, d: 201 },
			{ k: 2, d: 202 },
		],
	});
});
