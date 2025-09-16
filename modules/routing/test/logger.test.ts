import { Logger } from '@modules/routing/logger';

// If you reformat this section of the file, you will need to update the expected line numbers
function logCaller(logger: Logger) {
	return logger.getMessage('msg', logger.getCallerInfo(-1));
}

function getWrappedSum(logger: Logger) {
	const addNumbers = async (a: number, b: number) => a + b;
	return logger.wrapFn(addNumbers);
}

function getWrappedFailFn(logger: Logger) {
	const failFn = async (x: number) => {
		throw new Error('fail');
	};
	const wrappedFailFn = logger.wrapFn(failFn);
	return wrappedFailFn;
}

// end of section that you shouldn't reformat

const expectedCallerInfo = '[logger.test.ts:5::logCaller]';
const expectedWrappedSum = '[logger.test.ts:10::getWrappedSum]';
const expectedWrappedFailFn = '[logger.test.ts:17::getWrappedFailFn]';

test('it should be a no-op if theres no context', () => {
	const logger = new Logger();
	expect(logCaller(logger)).toEqual(expectedCallerInfo + ' msg');
});

test('it should add space separated context when you add a single item', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	expect(logCaller(logger)).toEqual('A-S123 ' + expectedCallerInfo + ' msg');
});

test('it should add space separated context when you add multiple items', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	logger.mutableAddContext('Contribution');
	expect(logCaller(logger)).toEqual(
		'A-S123 Contribution ' + expectedCallerInfo + ' msg',
	);
});

describe('wrapFn', () => {
	let logs: any[];
	let errors: any[];
	let logger: Logger;

	beforeEach(() => {
		logs = [];
		errors = [];
		logger = new Logger(
			[],
			(...args) => logs.push(args),
			(...args) => errors.push(args),
		);
	});

	test('logs entry and exit for successful async function', async () => {
		const wrappedSum = getWrappedSum(logger);
		const result = await wrappedSum(2, 3);

		expect(result).toBe(5);

		const expectedEntry = [
			`${expectedWrappedSum} TRACE addNumbers ENTRY ARGS`,
			{ a: 2, b: 3 },
		];

		const expectedExit = [
			`${expectedWrappedSum} TRACE addNumbers EXIT SHORT_ARGS`,
			{ a: 2 }, // default short args is 1
			'RESULT',
			5,
		];
		expect(logs).toEqual([expectedEntry, expectedExit]);
		expect(errors).toEqual([]);
	});

	test('logs entry and error for rejected async function', async () => {
		const wrappedFailFn = getWrappedFailFn(logger);
		await expect(wrappedFailFn(42)).rejects.toThrow('fail');

		const expectedEntry = [
			`${expectedWrappedFailFn} TRACE failFn ENTRY ARGS`,
			{ x: 42 },
		];

		const expectedError = [
			`${expectedWrappedFailFn} TRACE failFn ERROR SHORT_ARGS`,
			{ x: 42 },
			'ERROR',
			expect.any(Error),
		];

		expect(logs).toEqual([expectedEntry]);
		expect(errors).toEqual([expectedError]);
		expect(errors[0][3].message).toBe('fail');
	});

	test('uses parameter names from fnAsString if provided', async () => {
		const customName = async function customName(foo: string, bar: number) {
			return foo + bar;
		};
		const wrapped = logger.wrapFn(
			customName.bind({}),
			'customName',
			customName.toString(),
		);
		await wrapped('a', 1);

		expect(logs[0][1]).toEqual({ foo: 'a', bar: 1 });
	});

	test('shortArgsNum limits the number of args in exit log', async () => {
		const fn = async (x: number, y: number, z: number) => x + y + z;
		const wrapped = logger.wrapFn(fn, 'sum3', undefined, 2);
		await wrapped(1, 2, 3);

		expect(logs[1][1]).toEqual({ x: 1, y: 2 });
	});

	test('shortArgsNum misses the args marker when there are no args needed', async () => {
		const fn = async (x: number, y: number, z: number) => x + y + z;
		const wrapped = logger.wrapFn(fn, 'sum3', undefined, 0);
		await wrapped(1, 2, 3);

		// don't care about the file/function, but it shouldn't have SHORT_ARGS
		expect(logs[1][0]).toMatch(new RegExp('\\[.+] TRACE sum3 EXIT'));
	});
});
