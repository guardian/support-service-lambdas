import { z } from 'zod';

/**
 * Generic validation function that validates input against a Zod schema
 * @param event - The input event data to validate
 * @param schema - The Zod schema to validate against
 * @param errorMessage - Optional custom error message (defaults to generic validation error)
 * @returns The parsed and validated data
 * @throws Error if validation fails
 */
export function validateInput<TInput, TOutput>(
	event: TInput,
	schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
	errorMessage?: string,
): TOutput {
	const parsedEventResult = schema.safeParse(event);

	if (!parsedEventResult.success) {
		const defaultMessage = `Input validation failed: ${parsedEventResult.error.message}`;
		throw new Error(errorMessage || defaultMessage);
	}

	return parsedEventResult.data;
}

/**
 * Validates input and returns a result object instead of throwing an error
 * @param event - The input event data to validate
 * @param schema - The Zod schema to validate against
 * @returns An object with success flag and either data or error
 */
export function validateInputSafe<TInput, TOutput>(
	event: TInput,
	schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
): { success: true; data: TOutput } | { success: false; error: string } {
	const parsedEventResult = schema.safeParse(event);

	if (!parsedEventResult.success) {
		return {
			success: false,
			error: `Input validation failed: ${parsedEventResult.error.message}`,
		};
	}

	return {
		success: true,
		data: parsedEventResult.data,
	};
}
