import { z } from 'zod';

export const SalesforceAttributesSchema = z.object({
	type: z.string(),
	url: z.string().optional(),
});

export const RecordSchema = z.object({
    attributes: SalesforceAttributesSchema,
    Id: z.string(),
});

export const SalesforceQueryResponseSchema = <T extends z.ZodTypeAny>(schema: T) => z.object({
	totalSize: z.number(),
	done: z.boolean(),
	records: z.array(schema),
});
  
export type SalesforceQueryResponse<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof SalesforceQueryResponseSchema<T>>>;