import { z } from 'zod';

export const sqsMessageSchema = z.object({
	email: z.string().email(),
	identityId: z.string().min(1),
	voucherType: z.string().min(1),
});

export type SqsMessage = z.infer<typeof sqsMessageSchema>;

export const imovoVoucherResponseSchema = z.object({
	voucherCode: z.string(),
	expiryDate: z.string(),
	balance: z.number().optional(),
	message: z.string().optional(),
	successfulRequest: z.boolean(),
});

export type ImovoVoucherResponse = z.infer<typeof imovoVoucherResponseSchema>;

export interface VoucherRecord {
	identityId: string;
	requestTimestamp: string;
	email: string;
	voucherType: string;
	voucherCode: string;
	expiryDate: string;
	status: 'SUCCESS' | 'FAILED';
}
