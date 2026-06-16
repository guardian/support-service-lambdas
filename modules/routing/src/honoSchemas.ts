import { z } from '@hono/zod-openapi';

/**
 * Wraps a zod schema into the standard hono/zod-openapi response content shape.
 * Equivalent to the `jsonContent` helper added in later versions of @hono/zod-openapi.
 */
export const jsonContent = <S extends z.ZodType>(
	schema: S,
	description: string,
) => ({
	content: { 'application/json': { schema } },
	description,
});

/**
 * Standard 400 response schema for hono routes.
 * Two distinct sources, modelled as a union:
 *  - input validation failures (defaultHook):           { error, details }
 *  - domain validation errors (onError ValidationError): { message }
 */
export const badRequestSchema = z.union([
	z.object({ error: z.string(), details: z.array(z.unknown()) }),
	z.object({ message: z.string() }),
]);

/**
 * Standard 500 response schema for hono routes.
 */
export const internalServerErrorSchema = z.object({
	message: z.string(),
});

/**
 * Standard 400 and 500 responses for use in createRoute.
 * Spread into the responses object:
 *   responses: { 200: jsonContent(mySchema, 'OK'), ...errorResponses }
 */
export const errorResponses = {
	400: jsonContent(badRequestSchema, 'Validation error'),
	500: jsonContent(internalServerErrorSchema, 'Internal server error'),
};

/**
 * Standard request headers for routes that use the MMA identity check.
 * Declares x-identity-id (checked by fetchSubscriptionWithIdentityCheck)
 * and x-api-key (API Gateway key).
 */
export const mmaRequestHeaders = z.object({
	'x-api-key': z.string().optional(),
	'x-identity-id': z.string().optional(),
});

export type BadRequest = z.infer<typeof badRequestSchema>;
export type InternalServerError = z.infer<typeof internalServerErrorSchema>;
