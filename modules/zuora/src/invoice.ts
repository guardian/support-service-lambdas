import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	GetInvoiceItemsResponse,
	GetInvoiceResponse,
	InvoiceItemAdjustmentResult,
	InvoiceItemAdjustmentSourceType,
	InvoiceItemAdjustmentType,
} from '@modules/zuora/zuoraSchemas';
import {
	getInvoiceItemsSchema,
	getInvoiceSchema,
	invoiceItemAdjustmentResultSchema,
} from '@modules/zuora/zuoraSchemas';

export const getInvoice = async (
	zuoraClient: ZuoraClient,
	invoiceId: string,
): Promise<GetInvoiceResponse> => {
	console.log(`Getting invoice with id ${invoiceId}`);
	return await zuoraClient.get(`/v1/invoices/${invoiceId}`, getInvoiceSchema);
};

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
	adjustmentDate: Dayjs,
	zuoraClient: ZuoraClient,
	invoiceId: string,
	sourceId: string,
	amount: number,
	type: InvoiceItemAdjustmentType,
	sourceType: InvoiceItemAdjustmentSourceType,
	comment?: string,
	reasonCode?: string,
): Promise<InvoiceItemAdjustmentResult> => {
	console.log(`Adjusting invoice ${invoiceId} by ${amount}`);
	return await zuoraClient.post(
		'/v1/object/invoice-item-adjustment',
		JSON.stringify({
			AdjustmentDate: zuoraDateFormat(adjustmentDate),
			Amount: amount,
			InvoiceId: invoiceId,
			SourceId: sourceId,
			SourceType: sourceType,
			Type: type,
			Comment: comment ?? 'Created by support-service-lambdas',
			ReasonCode: reasonCode,
		}),
		invoiceItemAdjustmentResultSchema,
	);
};
