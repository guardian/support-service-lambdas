import z from 'zod';

export const requestSchema = z.object({
	subscriptionId: z.string(),
	postCode: z.string().nonempty(),
});
export type RequestBody = z.infer<typeof requestSchema>;

export const responseSchema = z.union([
	z.object({
		isActive: z.literal(true),
		renews: z.string(),
	}),
	z.object({ isActive: z.literal(false) }),
]);
export type ResponseBody = z.infer<typeof responseSchema>;
