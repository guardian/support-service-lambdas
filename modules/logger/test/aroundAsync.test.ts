import { aroundAsync } from '../src/aroundAsync';

describe('aroundAsync', () => {
	test('calls before and after in order and passes context on success', async () => {
		const calls: string[] = [];
		const beforeArgs: number[][] = [];
		const afterValues: Array<{ result: number; context: string }> = [];
		const onErrorValues: unknown[] = [];

		const fn = (x: number): Promise<number> => Promise.resolve(x + 1);
		const wrapped = aroundAsync(fn, {
			before: (args) => {
				calls.push('before');
				beforeArgs.push(args);
				return `ctx-${args[0]}`;
			},
			after: (result, context) => {
				calls.push('after');
				afterValues.push({ result, context });
			},
			onError: (error, context) => {
				calls.push('onError');
				onErrorValues.push({ error, context });
			},
		});

		const actual = await wrapped(2);

		expect(actual).toBe(3);
		expect(calls).toEqual(['before', 'after']);
		expect(beforeArgs).toEqual([[2]]);
		expect(afterValues).toEqual([{ result: 3, context: 'ctx-2' }]);
		expect(onErrorValues).toEqual([]);
	});

	test('calls before and onError in order and rethrows the same error object', async () => {
		const calls: string[] = [];
		const onErrorValues: Array<{ error: unknown; context: string }> = [];
		const expectedError = new Error('boom');

		const fn = (x: number): Promise<number> =>
			x > 0 ? Promise.reject(expectedError) : Promise.resolve(0);

		const wrapped = aroundAsync(fn, {
			before: (args) => {
				calls.push('before');
				return `ctx-${args[0]}`;
			},
			after: () => {
				calls.push('after');
			},
			onError: (error, context) => {
				calls.push('onError');
				onErrorValues.push({ error, context });
			},
		});

		await expect(wrapped(4)).rejects.toBe(expectedError);
		expect(calls).toEqual(['before', 'onError']);
		expect(onErrorValues).toEqual([{ error: expectedError, context: 'ctx-4' }]);
	});

	test('calls before once per invocation', async () => {
		const beforeArgs: number[][] = [];
		const fn = (x: number): Promise<number> => Promise.resolve(x);

		const wrapped = aroundAsync(fn, {
			before: (args) => {
				beforeArgs.push(args);
				return 'ctx';
			},
			after: () => undefined,
			onError: () => undefined,
		});

		await wrapped(1);
		await wrapped(2);

		expect(beforeArgs).toEqual([[1], [2]]);
	});
});
