/**
 * An error that retrying can't fix, such as inconsistent data. The refund state machine fails the execution as soon as
 * a step throws one, rather than retrying the step.
 */
export class PermanentError extends Error {
	override name = 'PermanentError';
}
