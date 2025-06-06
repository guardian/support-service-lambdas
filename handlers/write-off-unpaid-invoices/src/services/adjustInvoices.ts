import { stageFromEnvironment } from '@modules/stage';
import { type LambdaEvent } from '../handlers/writeOffInvoices';
import { getInvoice, getInvoiceItems } from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export const adjustInvoices = async (event: LambdaEvent) => {
	const stage = stageFromEnvironment();
	const { Items } = event;
	const zuoraClient = await ZuoraClient.create(stage);

	for (const item of Items) {
		const invoiceId = item.invoice_id;

		const invoice = await getInvoice(zuoraClient, invoiceId);
		console.log(invoice);

		const invoiceItems = await getInvoiceItems(zuoraClient, invoiceId);
		console.log(invoiceItems);
	}
};
