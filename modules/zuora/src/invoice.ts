import type { Dayjs } from 'dayjs';
import { getInvoiceItemsSchema } from './types';
import type { GetInvoiceItemsResponse } from './types';
import {
	InvoiceItemAdjustmentResult,
	invoiceItemAdjustmentResultSchema,
	InvoiceItemAdjustmentSourceType,
	InvoiceItemAdjustmentType,
} from './types';
import { getInvoiceSchema } from './types';
import type { GetInvoiceResponse } from './types';
import { zuoraDateFormat } from './utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

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
