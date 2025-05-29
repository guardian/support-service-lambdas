import {
	createInvoiceItemAdjustments,
	type CreateInvoiceItemAdjustmentsInput,
} from '../services/createInvoiceItemAdjustments';

export type LambdaEvent = {
	Items: CreateInvoiceItemAdjustmentsInput[];
};

export const handler = async (event: LambdaEvent) => {
	console.log(JSON.stringify(event, null, 2));
	await createInvoiceItemAdjustments(event);
};
