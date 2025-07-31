import { z } from 'zod';

// --------------- Basic success response ---------------
export const zuoraSuccessResponseSchema = z.object({
	success: z.boolean(),
	reasons: z.optional(
		z.array(z.object({ code: z.number(), message: z.string() })),
	),
});

export const zuoraUpperCaseSuccessResponseSchema = z.object({
	Success: z.boolean(), //to do add reasons in case of failure
});

export type ZuoraSuccessResponse = z.infer<typeof zuoraSuccessResponseSchema>;

export type ZuoraUpperCaseSuccessResponse = z.infer<
	typeof zuoraUpperCaseSuccessResponseSchema
>;
