import { z } from 'zod';

// Zod schema definitions
export const zuoraReasonSchema = z.object({
	code: z.string().or(z.number()),
	message: z.string(),
});

export const zuoraErrorItemSchema = z.object({
	Code: z.string(),
	Message: z.string(),
});

export const lowerCaseZuoraErrorSchema = z.object({
	success: z.literal(false),
	reasons: z.array(zuoraReasonSchema),
});
export const upperCaseZuoraErrorSchema = z.object({
	Success: z.literal(false),
	Errors: z.array(zuoraErrorItemSchema),
});
export const faultCodeAndMessageSchema = z.object({
	FaultCode: z.string(),
	FaultMessage: z.string(),
});
export const codeAndMessageSchema = z.object({
	code: z.string(),
	message: z.string(),
});
export const zuoraErrorSchema = z.union([
	lowerCaseZuoraErrorSchema,
	upperCaseZuoraErrorSchema,
	faultCodeAndMessageSchema,
	codeAndMessageSchema,
]);
export const zuoraSuccessSchema = z
	.object({
		success: z.literal('true'),
	})
	.or(
		z.object({
			Success: z.literal('true'),
		}),
	);

export const zuoraResponseSchema = z.object({
	// Success indicators (some endpoints use different casing)
	success: z.boolean().optional(),
	Success: z.boolean().optional(),
	// Error details in various formats
	reasons: z.array(zuoraReasonSchema).optional(),
	Errors: z.array(zuoraErrorItemSchema).optional(),
	FaultCode: z.string().optional(),
	FaultMessage: z.string().optional(),
	code: z.string().optional(),
	message: z.string().optional(),
});
export type ZuoraResponse = z.infer<typeof zuoraResponseSchema>;

export const createQueryResponseSchema = <T extends z.ZodRawShape>(
	recordShape: T,
) => {
	return z
		.object({
			done: z.boolean(),
			size: z.number(),
			records: z.array(z.object(recordShape)).optional(),
		})
		.strict();
};
