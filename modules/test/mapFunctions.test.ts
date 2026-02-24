import {
	groupByUniqueOrThrowMap,
	groupCollectByUniqueOrThrowMap,
	groupCollectMap,
	joinAllLeft,
	mapValuesMap,
	objectJoinBijective,
	objectLeftJoin,
	partitionByValueType,
} from '../mapFunctions';

describe('mapValuesMap', () => {
	test('transforms map values', () => {
		const input: Map<string, number> = new Map([
			['a', 1],
			['b', 2],
			['c', 3],
		]);
		const result: Map<string, string> = mapValuesMap(input, (v) => `${v * 10}`);
		expect(result).toEqual(
			new Map([
				['a', '10'],
				['b', '20'],
				['c', '30'],
			]),
		);
	});

	test('filters out undefined results', () => {
		const input = new Map([
			['a', 1],
			['b', 2],
			['c', 3],
		]);
		const result = mapValuesMap(input, (v) => (v > 1 ? v * 10 : undefined));
		expect(result).toEqual(
			new Map([
				['b', 20],
				['c', 30],
			]),
		);
	});

	test('passes key to transform function', () => {
		const input = new Map([
			['a', 1],
			['b', 2],
		]);
		const result = mapValuesMap(input, (v, k) => `${k}:${v}`);
		expect(result).toEqual(
			new Map([
				['a', 'a:1'],
				['b', 'b:2'],
			]),
		);
	});

	test('handles empty map', () => {
		const input = new Map<string, number>();
		const result = mapValuesMap(input, (v) => v * 10);
		expect(result).toEqual(new Map());
	});
});

describe('groupCollectMap', () => {
	test('groups array items by key', () => {
		const input = [
			{ type: 'a', value: 1 },
			{ type: 'b', value: 2 },
			{ type: 'a', value: 3 },
		];
		const result = groupCollectMap(input, (item) => [item.type, item.value]);
		expect(result).toEqual(
			new Map([
				['a', [1, 3]],
				['b', [2]],
			]),
		);
	});

	test('filters out undefined entries', () => {
		const input = [1, 2, 3, 4, 5];
		const result = groupCollectMap(input, (n) =>
			n > 2 ? ['big', n] : undefined,
		);
		expect(result).toEqual(new Map([['big', [3, 4, 5]]]));
	});

	test('handles empty array', () => {
		const result = groupCollectMap([], (item: number) => ['key', item]);
		expect(result).toEqual(new Map());
	});

	test('works with non-string keys', () => {
		const input = [1, 2, 3, 4];
		const result = groupCollectMap(input, (n) => [n % 2, n]);
		expect(result).toEqual(
			new Map([
				[1, [1, 3]],
				[0, [2, 4]],
			]),
		);
	});
});

describe('groupByUniqueOrThrowMap', () => {
	test('groups items by unique key', () => {
		const input = [
			{ id: 'a', value: 1 },
			{ id: 'b', value: 2 },
			{ id: 'c', value: 3 },
		];
		const result = groupByUniqueOrThrowMap(input, (item) => item.id, 'test');
		expect(result).toEqual(
			new Map([
				['a', { id: 'a', value: 1 }],
				['b', { id: 'b', value: 2 }],
				['c', { id: 'c', value: 3 }],
			]),
		);
	});

	test('throws on duplicate keys', () => {
		const input = [
			{ id: 'a', value: 1 },
			{ id: 'a', value: 2 },
		];
		expect(() =>
			groupByUniqueOrThrowMap(input, (item) => item.id, 'duplicate test'),
		).toThrow('duplicate keys: duplicate test');
	});

	test('handles empty array', () => {
		const result = groupByUniqueOrThrowMap(
			[] as Array<{ id: string }>,
			(item) => item.id,
			'test',
		);
		expect(result).toEqual(new Map());
	});
});

describe('groupCollectByUniqueOrThrowMap', () => {
	test('collects items by unique key-value pairs', () => {
		const input = [
			{ id: 'a', value: 1 },
			{ id: 'b', value: 2 },
		];
		const result = groupCollectByUniqueOrThrowMap(
			input,
			(item) => [item.id, item.value],
			'test',
		);
		expect(result).toEqual(
			new Map([
				['a', 1],
				['b', 2],
			]),
		);
	});

	test('filters out undefined entries before checking uniqueness', () => {
		const input = [1, 2, 3, 4, 5];
		const result = groupCollectByUniqueOrThrowMap(
			input,
			(n) => (n > 2 ? [`key${n}`, n * 10] : undefined),
			'test',
		);
		expect(result).toEqual(
			new Map([
				['key3', 30],
				['key4', 40],
				['key5', 50],
			]),
		);
	});

	test('throws on duplicate keys after filtering', () => {
		const input = [
			{ type: 'a', value: 1 },
			{ type: 'a', value: 2 },
		];
		expect(() =>
			groupCollectByUniqueOrThrowMap(
				input,
				(item) => [item.type, item.value],
				'duplicate collect test',
			),
		).toThrow('duplicate keys: duplicate collect test');
	});
});

describe('objectLeftJoin', () => {
	test('joins two maps by keys', () => {
		const left = new Map([
			['a', 1],
			['b', 2],
		]);
		const right = new Map([
			['a', 'x'],
			['b', 'y'],
		]);
		const result = objectLeftJoin(left, right);
		expect(result).toEqual([
			[1, 'x', 'a'],
			[2, 'y', 'b'],
		]);
	});

	test('returns undefined for missing right values', () => {
		const left = new Map([
			['a', 1],
			['b', 2],
		]);
		const right = new Map([['a', 'x']]);
		const result = objectLeftJoin(left, right);
		expect(result).toEqual([
			[1, 'x', 'a'],
			[2, undefined, 'b'],
		]);
	});

	test('handles empty left map', () => {
		const left = new Map<string, number>();
		const right = new Map([['a', 'x']]);
		const result = objectLeftJoin(left, right);
		expect(result).toEqual([]);
	});

	test('handles empty right map', () => {
		const left = new Map([['a', 1]]);
		const right = new Map<string, string>();
		const result = objectLeftJoin(left, right);
		expect(result).toEqual([[1, undefined, 'a']]);
	});
});

describe('joinAllLeft', () => {
	test('joins two maps when all left keys exist in right', () => {
		const left = new Map([
			['a', 1],
			['b', 2],
		]);
		const right = new Map([
			['a', 'x'],
			['b', 'y'],
			['c', 'z'],
		]);
		const result = joinAllLeft(left, right);
		expect(result).toEqual([
			[1, 'x', 'a'],
			[2, 'y', 'b'],
		]);
	});

	test('throws when left key is missing from right', () => {
		const left = new Map([
			['a', 1],
			['b', 2],
		]);
		const right = new Map([['a', 'x']]);
		expect(() => joinAllLeft(left, right)).toThrow(
			'left had an id that was missing from the right lookup',
		);
	});

	test('handles empty maps', () => {
		const left = new Map<string, number>();
		const right = new Map<string, string>();
		const result = joinAllLeft(left, right);
		expect(result).toEqual([]);
	});
});

describe('objectJoinBijective', () => {
	test('joins two maps with exact key match', () => {
		const left = new Map<'a' | 'b', number>([
			['a', 1],
			['b', 2],
		]);
		const right = new Map<'a' | 'b', string>([
			['a', 'x'],
			['b', 'y'],
		]);
		const result = objectJoinBijective(left, right);
		expect(result).toEqual([
			[1, 'x'],
			[2, 'y'],
		]);
	});

	test('throws when left has keys not in right', () => {
		const left = new Map<'a' | 'b' | 'c', number>([
			['a', 1],
			['b', 2],
			['c', 3],
		]);
		const right = new Map<'a' | 'b' | 'c', string>([
			['a', 'x'],
			['b', 'y'],
		]);
		expect(() => objectJoinBijective(left, right)).toThrow(
			'Keys do not match between records: onlyInL: c onlyInR:',
		);
	});

	test('throws when right has keys not in left', () => {
		const left = new Map<'a' | 'b', number>([['a', 1]]);
		const right = new Map<'a' | 'b', string>([
			['a', 'x'],
			['b', 'y'],
		]);
		expect(() => objectJoinBijective(left, right)).toThrow(
			'Keys do not match between records: onlyInL:  onlyInR: b',
		);
	});

	test('throws when both have mismatched keys', () => {
		const left = new Map<'a' | 'b' | 'c', number>([
			['a', 1],
			['c', 3],
		]);
		const right = new Map<'a' | 'b' | 'c', string>([
			['a', 'x'],
			['b', 'y'],
		]);
		expect(() => objectJoinBijective(left, right)).toThrow(
			'Keys do not match between records: onlyInL: c onlyInR: b',
		);
	});

	test('handles empty maps', () => {
		const left = new Map<never, number>();
		const right = new Map<never, string>();
		const result = objectJoinBijective(left, right);
		expect(result).toEqual([]);
	});
});

describe('partitionByValueType', () => {
	test('partitions map by type predicate', () => {
		const input = new Map<string, string | number>([
			['a', 1],
			['b', 'hello'],
			['c', 2],
			['d', 'world'],
		]);
		const isNumber = (v: string | number): v is number => typeof v === 'number';
		const [numbers, strings] = partitionByValueType(input, isNumber);
		expect(numbers).toEqual(
			new Map([
				['a', 1],
				['c', 2],
			]),
		);
		expect(strings).toEqual(
			new Map([
				['b', 'hello'],
				['d', 'world'],
			]),
		);
	});

	test('passes key to predicate', () => {
		const input = new Map<string, number>([
			['keep', 1],
			['discard', 2],
			['keep2', 3],
		]);
		const startsWithKeep = (
			_v: number,
			k: string,
		): _v is number & { __brand: 'keep' } => k.startsWith('keep');
		const [kept, discarded] = partitionByValueType(input, startsWithKeep);
		expect(kept).toEqual(
			new Map([
				['keep', 1],
				['keep2', 3],
			]),
		);
		expect(discarded).toEqual(new Map([['discard', 2]]));
	});

	test('handles empty map', () => {
		const input = new Map<string, string | number>();
		const isNumber = (v: string | number): v is number => typeof v === 'number';
		const [numbers, strings] = partitionByValueType(input, isNumber);
		expect(numbers).toEqual(new Map());
		expect(strings).toEqual(new Map());
	});

	test('handles all pass', () => {
		const input = new Map<string, number>([
			['a', 1],
			['b', 2],
		]);
		const isNumber = (v: number): v is number => typeof v === 'number';
		const [numbers, others] = partitionByValueType(input, isNumber);
		expect(numbers).toEqual(
			new Map([
				['a', 1],
				['b', 2],
			]),
		);
		expect(others).toEqual(new Map());
	});

	test('handles all fail', () => {
		const input = new Map<string, string>([
			['a', 'x'],
			['b', 'y'],
		]);
		const isNumber = (v: string): v is never => typeof v === 'number';
		const [numbers, strings] = partitionByValueType(input, isNumber);
		expect(numbers).toEqual(new Map());
		expect(strings).toEqual(
			new Map([
				['a', 'x'],
				['b', 'y'],
			]),
		);
	});
});
