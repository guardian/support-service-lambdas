import { z } from 'zod';

// Type definitions for Zuora response formats
export type ZuoraReason = {
	code: string;
	message: string;
};

export type ZuoraErrorItem = {
	Code: string;
	Message: string;
};

export type ZuoraResponse = {
	// Success indicators (some endpoints use different casing)
	success?: boolean;
	Success?: boolean;
	// Error details in various formats
	reasons?: ZuoraReason[];
	Errors?: ZuoraErrorItem[];
	FaultCode?: string;
	FaultMessage?: string;
	code?: string;
	message?: string;
};

// Zod schema definitions
export const zuoraReasonSchema = z.object({
	code: z.string(),
	message: z.string(),
});

export const zuoraErrorItemSchema = z.object({
	Code: z.string(),
	Message: z.string(),
});

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
