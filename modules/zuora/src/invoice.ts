import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
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
import { zuoraResponseSchema } from './types';
import type { ZuoraResponse } from './types';
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

export const writeOffInvoice = async (
	zuoraClient: ZuoraClient,
	invoiceNumber: string,
	comment: string,
): Promise<ZuoraResponse> => {
	console.log(`Writing off invoice ${invoiceNumber} with comment: ${comment}`);
	const path = `/v1/invoices/${invoiceNumber}/write-off`;
	const body = JSON.stringify({
		comment,
		memoDate: dayjs().format('YYYY-MM-DD'),
		reasonCode: 'Write-off',
	});
	return zuoraClient.put(path, body, zuoraResponseSchema);
};
