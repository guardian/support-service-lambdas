import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	GetInvoiceItemsResponse,
	InvoiceItemAdjustmentResult,
} from '@modules/zuora/zuoraSchemas';
import {
	getInvoiceItemsSchema,
	invoiceItemAdjustmentResultSchema,
} from '@modules/zuora/zuoraSchemas';

export const getInvoiceItems = async (
	zuoraClient: ZuoraClient,
	invoiceId: string,
): Promise<GetInvoiceItemsResponse> => {
	console.log(`Getting invoice items for invoice ${invoiceId}`);
	return await zuoraClient.get(
		`/v1/invoices/${invoiceId}/items`,
		getInvoiceItemsSchema,
	);
};

export const creditInvoice = async (
	adjustmentDate: Date,
	zuoraClient: ZuoraClient,
	invoiceId: string,
	invoiceItemId: string,
	amount: number,
	comments?: string,
): Promise<InvoiceItemAdjustmentResult> => {
	console.log(`Adjusting invoice ${invoiceId} by ${amount}`);
	return await zuoraClient.post(
		'/v1/object/invoice-item-adjustment',
		JSON.stringify({
			AdjustmentDate: adjustmentDate,
			Amount: amount,
			InvoiceId: invoiceId,
			SourceId: invoiceItemId,
			SourceType: 'InvoiceDetail',
			Type: 'Credit',
			Comments: comments ?? 'Created by support-service-lambdas',
		}),
		invoiceItemAdjustmentResultSchema,
	);
};
