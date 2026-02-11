import { z } from 'zod';

export const sqsMessageSchema = z.object({
	email: z.string().email(),
	identityId: z.string().min(1),
	voucherType: z.string().min(1),
});

export type SqsMessage = z.infer<typeof sqsMessageSchema>;

export const imovoVoucherResponseSchema = z.object({
	VoucherCode: z.string(),
	ExpiryDate: z.string(),
	VoucherValue: z.string().optional(),
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
