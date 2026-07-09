export interface AroundHooks<
	TFn extends (...args: never[]) => Promise<unknown>,
	TInvocationContext,
> {
	before: (args: Parameters<TFn>) => TInvocationContext;
	after: (
		result: Awaited<ReturnType<TFn>>,
		context: TInvocationContext,
	) => void;
	onError: (error: unknown, context: TInvocationContext) => void;
}

/**
 * this is a utility function to wrap another async function, without losing the generic types.
 *
 * It has to use casts to get back the original generic types, hence its extraction as a minimal utility function.
 *
 * @param fn
 * @param hooks
 */
export function aroundAsync<
	TFn extends (...args: never[]) => Promise<unknown>,
	TInvocationContext,
>(fn: TFn, hooks: AroundHooks<TFn, TInvocationContext>): TFn {
	const wrapped = async (
		...args: Parameters<TFn>
	): Promise<Awaited<ReturnType<TFn>>> => {
		const context = hooks.before(args);

		try {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- required because generic function implementations erase concrete return typing
			const result = (await fn(...args)) as Awaited<ReturnType<TFn>>;
			hooks.after(result, context);
			return result;
		} catch (error) {
			hooks.onError(error, context);
			throw error;
		}
	};

	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- required to preserve the exact original function type (including generics)
	return wrapped as unknown as TFn;
}
