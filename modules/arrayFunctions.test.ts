import {
	groupBy,
	groupMap,
	mapValues,
	partition,
	sortBy,
} from './arrayFunctions';

test('sortBy should sort by the relevant field', () => {
	const data = [
		{ l: 1, d: 102 },
		{ l: 3, d: 103 },
		{ l: 2, d: 101 },
	];
	const actual = sortBy(data, (item) => `${item.d}`);
	expect(actual).toEqual([
		{ l: 2, d: 101 },
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

test('groupMap should map correctly after grouping', () => {
	const data = [
		{ k: 1, d: 101 },
		{ k: 2, d: 201 },
		{ k: 1, d: 102 },
		{ k: 2, d: 201 },
	];
	const actual = groupMap(
		data,
		(item) => `${item.k}`,
		(item) => item.d,
	);
	expect(actual).toEqual({
		1: [101, 102],
		2: [201, 201],
	});
});

test('mapValues should map correctly', () => {
	const data = { a: 0, b: 10, c: 0 };
	const actual = mapValues(data, (n) => n + 1);
	expect(actual).toEqual({ a: 1, b: 11, c: 1 });
});

test('partition should separate accordingly', () => {
	const data = ['hello', 12, 23, 'hello', 'world', 12];
	const actual = partition(data, (item) => typeof item == 'number');
	expect(actual).toEqual([
		[12, 23, 12],
		['hello', 'hello', 'world'],
	]);
});
