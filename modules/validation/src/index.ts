import type { z } from 'zod';

export function validateInput<T>(
	event: unknown,
	schema: z.ZodType<T>,
	errorMessage?: string,
): T {
	const parsedEventResult = schema.safeParse(event);

	if (!parsedEventResult.success) {
		const defaultMessage = `Input validation failed: ${parsedEventResult.error.message}`;
		throw new Error(errorMessage ?? defaultMessage);
	}

	return parsedEventResult.data;
}

export function validateInputSafe<T>(
	event: unknown,
	schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; error: string } {
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
