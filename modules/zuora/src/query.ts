import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { invoiceItemResponseSchema } from '@modules/zuora/zuoraSchemas';

export const doQuery = async (zuoraClient: ZuoraClient): Promise<void> => {
	console.log(`Querying zuora for invoice items...`);
	const result = await zuoraClient.post(
		'/v1/action/query',
		JSON.stringify({
			queryString:
				"SELECT ChargeAmount, TaxAmount, ServiceStartDate, SubscriptionNumber FROM InvoiceItem WHERE SubscriptionNumber = 'A-S00424163' and ChargeName!='Delivery-problem credit' and ChargeName!='Holiday Credit' and ServiceStartDate = '2025-02-22' ",
		}),
		invoiceItemResponseSchema,
	);
	console.log('Query result:', result);

	// if (!result.Success) {
	// 	throw new Error('An error occurred while creating the payment');
	// }
};
