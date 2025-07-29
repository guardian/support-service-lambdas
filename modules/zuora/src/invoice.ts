import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	GetInvoiceItemsResponse,
	GetInvoiceResponse,
} from '@modules/zuora/zuoraSchemas';
import {
	getInvoiceItemsSchema,
	getInvoiceSchema,
} from '@modules/zuora/zuoraSchemas';
import { z } from 'zod';
import { createRecordResultSchema } from './types/actions/createRecordResponse';

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

export const creditInvoice = async <
	T extends z.ZodType = typeof createRecordResultSchema,
>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const finalSchema = (schema ?? createRecordResultSchema) as T;
	return zuoraClient.post(
		'/v1/object/invoice-item-adjustment',
		body,
		finalSchema,
	);
};
