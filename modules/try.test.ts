import { Try, Success, Failure, sequenceTry } from './try';

describe('Success', () => {
	it('should return the value with get', () => {
		const result = Success(42);
		expect(result.get()).toBe(42);
	});

	it('should return the value with getOrElse', () => {
		const result = Success(42);
		expect(result.getOrElse(100)).toBe(42);
	});

	it('should have success true', () => {
		const result = Success(42);
		expect(result.success).toBe(true);
	});

	it('should flatMap to a new Success', () => {
		const result = Success(42);
		const mapped = result.flatMap((n) => Success(n * 2));
		expect(mapped.success).toBe(true);
		expect(mapped.get()).toBe(84);
	});

	it('should flatMap to a Failure', () => {
		const result = Success(42);
		const error = new Error('flatMap error');
		const mapped = result.flatMap(() => Failure(error));
		expect(mapped.success).toBe(false);
		expect((mapped as Failure<void>).failure).toBe(error);
	});

	it('should not apply mapError', () => {
		const result = Success(42);
		const mapped = result.mapError(() => new Error('should not be called'));
		expect(mapped.success).toBe(true);
		expect(mapped.get()).toBe(42);
	});

	it('should map to a new Success', () => {
		const result = Success(42);
		const mapped = result.map((n) => n * 2);
		expect(mapped.success).toBe(true);
		expect(mapped.get()).toBe(84);
	});

	it('should map to a Failure if mapper throws', () => {
		const result = Success(42);
		const error = new Error('map error');
		const mapped = result.map(() => {
			throw error;
		});
		expect(mapped.success).toBe(false);
		expect((mapped as Failure<number>).failure).toBe(error);
	});
});

describe('Failure', () => {
	const error = new Error('test error');

	it('should throw error on get', () => {
		const result = Failure<number>(error);
		expect(() => result.get()).toThrow('test error');
	});

	it('should return default value with getOrElse', () => {
		const result = Failure<number>(error);
		expect(result.getOrElse(100)).toBe(100);
	});

	it('should have success false', () => {
		const result = Failure<number>(error);
		expect(result.success).toBe(false);
	});

	it('should expose the failure error', () => {
		const result = Failure<number>(error);
		expect(result.failure).toBe(error);
	});

	it('should not execute flatMap', () => {
		const result = Failure<number>(error);
		const mapped = result.flatMap((n) => Success(n * 2));
		expect(mapped.success).toBe(false);
		expect((mapped as Failure<number>).failure).toBe(error);
	});

	it('should apply mapError', () => {
		const result = Failure<number>(error);
		const wrapperMessage = 'mapped error';
		const mapped = result.mapError(
			(e) => new Error(wrapperMessage, { cause: e }),
		);
		expect(mapped.success).toBe(false);
		const finalFailure = (mapped as Failure<number>).failure;
		expect(finalFailure.message).toBe(wrapperMessage);
		expect(finalFailure.cause).toBe(error);
	});

	it('should not execute map', () => {
		const result = Failure<number>(error);
		const mapped = result.map((n) => n * 2);
		expect(mapped.success).toBe(false);
		expect((mapped as Failure<number>).failure).toBe(error);
	});
});

describe('Try', () => {
	it('should return Success for successful operation', () => {
		const result = Try(() => 42);
		expect(result.success).toBe(true);
		expect(result.get()).toBe(42);
	});

	it('should return Failure for throwing operation', () => {
		const error = new Error('operation failed');
		const result = Try(() => {
			throw error;
		});
		expect(result.success).toBe(false);
		expect((result as Failure<never>).failure).toBe(error);
	});

	it('should chain multiple operations with flatMap', () => {
		const result = Try(() => 10)
			.flatMap((n) => Success(n * 2))
			.flatMap((n) => Success(n + 5));

		expect(result.success).toBe(true);
		expect(result.get()).toBe(25);
	});
});

describe('sequenceTry', () => {
	it('should return Success for resolved promise', async () => {
		const promise = Promise.resolve(42);
		const result = await sequenceTry(promise);
		expect(result.success).toBe(true);
		expect(result.get()).toBe(42);
	});

	it('should return Failure for rejected promise', async () => {
		const error = new Error('promise failed');
		const promise = Promise.reject(error);
		const result = await sequenceTry(promise);
		expect(result.success).toBe(false);
		expect((result as Failure<never>).failure).toBe(error);
	});

	it('should handle non-Error rejections', async () => {
		const promise = Promise.reject('string error');
		const result = await sequenceTry(promise);
		expect(result.success).toBe(false);
		const failure = result as Failure<never>;
		expect(failure.failure.message).toBe('string error');
	});

	it('should chain operations after Promise Try', async () => {
		const promise = Promise.resolve(10);
		const result = await sequenceTry(promise);
		const chained = result
			.flatMap((n) => Success(n * 2))
			.flatMap((n) => Success(n + 5));

		expect(chained.success).toBe(true);
		expect(chained.get()).toBe(25);
	});
});
