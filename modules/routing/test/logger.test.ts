import { Logger } from '@modules/routing/logger';

// If you reformat this section of the file, you will need to update the expected line numbers
function getMessage(logger: Logger) {
	return (() => logger.getMessage(logger.getCallerInfo(), 'msg'))();
}

function getWrappedSum(logger: Logger) {
	const addNumbers = async (a: number, b: number) => Promise.resolve(a + b);
	return logger.wrapFn(addNumbers);
}

function getWrappedFailFn(logger: Logger) {
	const failFn: (x: number) => Promise<void> = async (x: number) =>
		Promise.reject(new Error('fail ' + x));
	return logger.wrapFn(failFn);
}

// end of section that you shouldn't reformat

const expectedCallerInfo = '[logger.test.ts:5::getMessage]';
const expectedWrappedSum = '[logger.test.ts:10::getWrappedSum]';
const expectedWrappedFailFn = '[logger.test.ts:16::getWrappedFailFn]';

test('it should be a no-op if theres no context', () => {
	const logger = new Logger([]);
	const actual = getMessage(logger);
	expect(actual).toEqual(expectedCallerInfo + ' msg');
});

test('it should add space separated context when you add a single item', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	expect(getMessage(logger)).toEqual('A-S123 ' + expectedCallerInfo + ' msg');
});

test('it should add space separated context when you add multiple items', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	logger.mutableAddContext('Contribution');
	expect(getMessage(logger)).toEqual(
		'A-S123 Contribution ' + expectedCallerInfo + ' msg',
	);
});

describe('wrapFn', () => {
	let logs: string[];
	let errors: string[];

	let logger: Logger;

	beforeEach(() => {
		logs = [];
		errors = [];
		logger = new Logger(
			[],
			(message) => logs.push(message),
			(message) => errors.push(message),
		);
	});

	test('logs entry and exit for successful async function', async () => {
		const wrappedSum = getWrappedSum(logger);
		const result = await wrappedSum(2, 3);

		expect(result).toBe(5);

		const expectedEntry = `${expectedWrappedSum} TRACE addNumbers ENTRY ARGS
a: 2
b: 3`;

		const expectedExit = `${expectedWrappedSum} TRACE addNumbers EXIT SHORT_ARGS
a: 2
RESULT
5`;

		expect(logs[0]).toEqual(expectedEntry);
		expect(logs[1]).toEqual(expectedExit);
		expect(logs).toEqual([expectedEntry, expectedExit]);
		expect(errors).toEqual([]);
	});

	test('logs entry and exit with complex objects', async () => {
		const fn = async (x: number[], y: object) =>
			Promise.resolve({ ...y, arr: x });
		const wrapped = logger.wrapFn(fn, undefined, undefined, 0);
		const result = await wrapped([2], { greeting: 'hi' });

		expect(result).toEqual({ arr: [2], greeting: 'hi' });

		const expectedEntry = `[stripped] TRACE fn ENTRY ARGS
x: [2]
y: { greeting: "hi" }`;
		const expectedExit = `[stripped] TRACE fn EXIT
RESULT
{ greeting: "hi", arr: [2] }`;

		expect(logs[0]?.replace(/^\[[^\]]+]/, '[stripped]')).toEqual(expectedEntry);
		expect(logs[1]?.replace(/^\[[^\]]+]/, '[stripped]')).toEqual(expectedExit);
		expect(errors).toEqual([]);
	});

	test('logs entry and error for rejected async function', async () => {
		const wrappedFailFn = getWrappedFailFn(logger);
		await expect(wrappedFailFn(42)).rejects.toThrow('fail');

		const expectedEntry = `${expectedWrappedFailFn} TRACE failFn ENTRY ARGS
x: 42`;

		const expectedErrorStart = `${expectedWrappedFailFn} TRACE failFn ERROR SHORT_ARGS
x: 42
ERROR
Error: fail 42
    at failFn `;
		expect(logs[0]).toEqual(expectedEntry);
		expect(errors[0]).toContain(expectedErrorStart);
	});

	test('uses parameter names from fnAsString if provided', async () => {
		const customName = async function customName(foo: string, bar: number) {
			return Promise.resolve(foo + bar);
		};
		const wrapped = logger.wrapFn(
			customName.bind({}),
			'customName',
			customName.toString(),
		);
		await wrapped('a', 1);

		expect(logs[0]).toContain(`TRACE customName ENTRY ARGS
foo: a
bar: 1`);
	});

	test('shortArgsNum limits the number of args in exit log', async () => {
		const fn = async (x: number, y: number, z: number) =>
			Promise.resolve(x + y + z);
		const wrapped = logger.wrapFn(fn, 'sum3', undefined, 2);
		await wrapped(1, 2, 3);

		expect(logs[1]).toContain(`TRACE sum3 EXIT SHORT_ARGS
x: 1
y: 2
RESULT
6`);
	});

	test('shortArgsNum misses the args marker when there are no args needed', async () => {
		const fn = async (x: number, y: number, z: number) =>
			Promise.resolve(x + y + z);
		const wrapped = logger.wrapFn(fn, 'sum3', undefined, 0);
		await wrapped(1, 2, 3);

		// don't care about the file/function, but it shouldn't have SHORT_ARGS
		expect(logs[1]).toMatch(new RegExp('\\[.+] TRACE sum3 EXIT'));
	});
});

describe('Logger.joinLines', () => {
	test('should pretty print errors correctly', () => {
		const logger = new Logger();
		const error = () => new Error('Test error');

		const actual = logger.prettyPrint(error());

		expect(actual).toContain(`Error: Test error
    at error (`);
	});

	test('should pretty print strings correctly', () => {
		const logger = new Logger();
		const msg = 'msg';

		const actual = logger.prettyPrint(msg);

		expect(actual).toEqual(`msg`);
	});

	test('should join primitive types, arrays, objects, and errors with compact or pretty JSON formatting without quotes around keys', () => {
		const logger = new Logger();
		const primitives = [42, 'hello', true, null, undefined];
		const shortArray = [1, 2, 3];
		const longArray = Array.from({ length: 30 }, (_, i) => i + 1);
		const shortObject = { a: 1, b: 'x' };
		const longObject = {
			a: 1,
			b: 'x',
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
		const error = new Error('Test error');

		const result = [
			...primitives,
			shortArray,
			longArray,
			shortObject,
			longObject,
			error,
		]
			.map(logger.prettyPrint)
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
				'{ a: 1, b: "x" }\n' +
				`{
  a: 1,
  b: "x",
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
}\n` +
				error.stack,
		);
	});
});
