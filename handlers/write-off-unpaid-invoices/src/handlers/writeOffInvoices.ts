import {
	// createInvoiceItemAdjustments,
	type CreateInvoiceItemAdjustmentsInput,
} from '../services/createInvoiceItemAdjustments';
import { adjustInvoices } from '../services/adjustInvoices';

export type LambdaEvent = {
	Items: CreateInvoiceItemAdjustmentsInput[];
};

export const handler = async (event: LambdaEvent) => {
	console.log(JSON.stringify(event, null, 2));
	// await createInvoiceItemAdjustments(event);
	await adjustInvoices(event);
};
