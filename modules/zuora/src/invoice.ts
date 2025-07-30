import type { Dayjs } from 'dayjs';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { GetInvoiceResponse } from '@modules/zuora/zuoraSchemas';
import { getInvoiceSchema } from '@modules/zuora/zuoraSchemas';
import { getInvoiceItemsSchema } from './types/objects/invoiceItem';
import type { GetInvoiceItemsResponse } from './types/objects/invoiceItem';
import {
	InvoiceItemAdjustmentResult,
	invoiceItemAdjustmentResultSchema,
	InvoiceItemAdjustmentSourceType,
	InvoiceItemAdjustmentType,
} from './types/objects/invoiceItemAdjustment';
import { zuoraDateFormat } from './utils/common';

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
