type Success<A> = { success: true } & Try<A>;
type Failure<A> = {
	success: false;
	failure: Error;
} & Try<A>;
export type Try<A> = {
	success: boolean;
	get: () => A;
	getOrElse: (v: A) => A;
	flatMap: <B>(fn: (a: A) => Try<B>) => Try<B>;
	mapError: (fn: (err: Error) => Error) => Try<A>;
};

export function Success<A>(get: A): Success<A> {
	return {
		success: true,
		get: () => get,
		getOrElse: (): A => get,
		flatMap: (fn) => fn(get),
		mapError: () => Success(get),
	} as const;
}

export function Failure<A>(error: Error): Failure<A> {
	return {
		success: false,
		get: () => {
			throw error;
		},
		failure: error,
		getOrElse: (v) => v,
		flatMap: () => Failure(error),
		mapError: (fn) => Failure(fn(error)),
	} as const;
}

export const Try: <A>(fn: () => A) => Try<A> = <A>(fn: () => A) => {
	try {
		const get = fn();
		return Success(get);
	} catch (error) {
		if (error instanceof Error) {
			return Failure<A>(error);
		}
		throw error;
	}
};
