import { prettyPrint } from '../src/prettyPrint';

describe('prettyPrint', () => {
	test('should pretty print errors correctly', () => {
		const error = () => new Error('Test error');

		const actual = prettyPrint(error());

		expect(actual).toContain(`Error: Test error
    at error (`);
	});

	test('should pretty print strings correctly', () => {
		const msg = 'msg';

		const actual = prettyPrint(msg);

		expect(actual).toEqual(`msg`);
	});

	test('should pretty print errors correctly', () => {
		const error = new Error('Test error', {
			cause: new MyError('another error'),
		});

		const actual = prettyPrint(error);

		const actualWithoutStackLines = actual
			.split('\n')
			.filter((s) => !s.startsWith('    at'));
		expect(actualWithoutStackLines).toEqual([
			'Error: Test error',
			'{ }',
			'Caused by: MyError: my error',
			'{ custom: "another error", name: "MyError" }',
		]);
	});

	test('should pretty print cyclical objects correctly', () => {
		const obj: Record<string, unknown> = { a: 1 };
		obj.self = obj;

		const actual = prettyPrint(obj);

		expect(actual).toEqual('{ a: 1, self: [Object@1] (back reference) }');
	});

	class Node {
		public self?: Node;
		constructor(public a: number) {}
	}

	test('should pretty print cyclical class instances correctly', () => {
		const node = new Node(1);
		node.self = node;

		const actual = prettyPrint(node);

		expect(actual).toEqual('{ a: 1, self: [Node@1] (back reference) }');
	});

	class MyError extends Error {
		constructor(public custom: string) {
			super('my error');
			this.name = 'MyError';
		}
	}

	test('should join primitive types, arrays, objects, and errors with compact or pretty JSON formatting without quotes around keys', () => {
		const primitives = [42, 'hello', true, null, undefined];
		const shortArray = [1, 2, 3];
		const longArray = Array.from({ length: 30 }, (_, i) => i + 1);
		const shortObject = { a: 1, b: '{"hello": "fish"}' };
		const longObject = {
			a: 1,
			b: '{"hello": "fish"}',
			c: 'y',
			d: 'z',
			e: 'w',
			f: 'v',
			g: 'u',
			h: 't',
			i: 's',
			j: 'r',
			k: 'q',
			l: 'p',
			m: 'o',
			n: 'n',
			o: 'm',
			p: 'l',
			q: 'k',
			r: 'j',
			s: 'i',
			t: 'h',
		};
		const error = new Error('Test error', {
			cause: new MyError('another error'),
		});

		const result = [
			...primitives,
			shortArray,
			longArray,
			shortObject,
			longObject,
			error,
		]
			.map(prettyPrint)
			.join('\n');

		expect(result).toBe(
			'42\nhello\ntrue\nnull\nundefined\n' +
				'[1,2,3]\n' +
				`[
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30
]\n` +
				'{ a: 1, b: "{\\"hello\\": \\"fish\\"}" }\n' +
				`{
  a: 1,
  b: "{\\"hello\\": \\"fish\\"}",
  c: "y",
  d: "z",
  e: "w",
  f: "v",
  g: "u",
  h: "t",
  i: "s",
  j: "r",
  k: "q",
  l: "p",
  m: "o",
  n: "n",
  o: "m",
  p: "l",
  q: "k",
  r: "j",
  s: "i",
  t: "h"
}
${error.stack}
{ }
Caused by: ${(error.cause as Error).stack}
{ custom: "another error", name: "MyError" }`,
		);
	});
});
