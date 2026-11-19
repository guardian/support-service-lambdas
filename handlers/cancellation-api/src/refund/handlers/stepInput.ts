import { z } from 'zod';
import { PermanentError } from '../permanentError';

/**
 * Parses a state machine step's input. Invalid input won't change on retry, so it's a PermanentError.
 */
export function parseStepInput<T extends z.ZodType>(
	schema: T,
	event: unknown,
): z.output<T> {
	const result = schema.safeParse(event);
	if (!result.success) {
		throw new PermanentError(
			`Invalid step input: ${z.prettifyError(result.error)}`,
			{ cause: result.error },
		);
	}
	return result.data;
}
