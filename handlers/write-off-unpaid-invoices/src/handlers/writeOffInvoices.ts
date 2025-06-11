import dayjs from 'dayjs';
import { stageFromEnvironment } from '@modules/stage';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type GetInvoiceItemsResponse,
	type InvoiceItemAdjustmentSourceType,
} from '@modules/zuora/zuoraSchemas';

export type CancelSource = 'MMA' | 'Autocancel' | 'Salesforce';

export type LambdaEvent = {
	Items: { invoice_id: string; cancel_source: CancelSource }[];
};

type AdjustableItem = {
	id: string;
	balance: number;
	sourceType: InvoiceItemAdjustmentSourceType;
};

export const cancelSourceToCommentMap: Record<CancelSource, string> = {
	MMA: 'MMA cancellation process leaving behind positive invoices if there was a payment failure. Write-off processed for the invoices.',
	Autocancel:
		'Auto-cancel cancelling the subscription but not balancing negative and positive invoices. Write-off processed for the invoices.',
	Salesforce:
		'Invoices left over after manual cancellation made in Salesforce or Zuora UI. Write-off processed for the invoices.',
};

export const handler = async (event: LambdaEvent) => {
	console.log(JSON.stringify(event, null, 2));
	const stage = stageFromEnvironment();
	const zuoraClient = await ZuoraClient.create(stage);

	for (const invoice of event.Items) {
		const { invoice_id: invoiceId, cancel_source: cancelSource } = invoice;
		const { balance } = await getInvoice(zuoraClient, invoiceId);

		if (balance == 0) continue;

		const { invoiceItems } = await getInvoiceItems(zuoraClient, invoiceId);
		const adjustableItems = getAdjustableItems({ invoiceItems });
		const sortedAdjustableItems = sortAdjustableItems({
			adjustableItems,
			balance,
		});

		let currentBalance = balance;

		for (const item of sortedAdjustableItems) {
			const adjustmentAmount = Math.min(
				Math.abs(item.balance),
				Math.abs(currentBalance),
			);

			await creditInvoice(
				dayjs(),
				zuoraClient,
				invoiceId,
				item.id,
				adjustmentAmount,
				item.balance > 0 ? 'Credit' : 'Charge',
				item.sourceType,
				cancelSourceToCommentMap[cancelSource as CancelSource],
				'Write-off',
			);

			currentBalance -= adjustmentAmount * (currentBalance > 0 ? 1 : -1);

			if (currentBalance == 0) break;
		}
	}
};

const getAdjustableItems = ({
	invoiceItems,
}: {
	invoiceItems: GetInvoiceItemsResponse['invoiceItems'];
}): AdjustableItem[] => {
	const invoiceDetailAndTaxItems = invoiceItems.flatMap((invoiceItem) => {
		const invoiceEntry = {
			id: invoiceItem.id,
			sourceType: 'InvoiceDetail' as InvoiceItemAdjustmentSourceType,
			balance: invoiceItem.balance,
		};

		const taxationEntries = invoiceItem.taxationItems.data.map((taxItem) => ({
			id: taxItem.id,
			sourceType: 'Tax' as InvoiceItemAdjustmentSourceType,
			balance: taxItem.balance,
		}));

		return [invoiceEntry, ...taxationEntries].filter(
			(item) => item.balance != 0,
		);
	});

	return invoiceDetailAndTaxItems;
};

const sortAdjustableItems = ({
	adjustableItems,
	balance,
}: {
	adjustableItems: AdjustableItem[];
	balance: number;
}): AdjustableItem[] => {
	if (balance > 0) {
		adjustableItems.sort((a, b) => b.balance - a.balance);
	} else {
		adjustableItems.sort((a, b) => a.balance - b.balance);
	}

	return adjustableItems;
};
