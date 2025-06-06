import { stageFromEnvironment } from '@modules/stage';
import { type LambdaEvent } from '../handlers/writeOffInvoices';
import { getInvoice, getInvoiceItems } from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export const adjustInvoices = async (event: LambdaEvent) => {
	const stage = stageFromEnvironment();
	// const { Items } = event;
	const zuoraClient = await ZuoraClient.create(stage);

	// for (const item of Items) {
	// const invoiceId = item.invoice_id;

	const invoice = await getInvoice(
		zuoraClient,
		'8ad093179739ff4c0197439d02d77292',
	);
	console.log(invoice);

	const invoiceItems = await getInvoiceItems(
		zuoraClient,
		'8ad093179739ff4c0197439d02d77292',
	);
	console.log(invoiceItems);
	// }
};
