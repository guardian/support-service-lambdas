import { stageFromEnvironment } from '@modules/stage';
import { type LambdaEvent } from '../handlers/writeOffInvoices';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
// import { type GetInvoiceItemsResponse } from '@modules/zuora/zuoraSchemas';

export const adjustInvoices = async (event: LambdaEvent) => {
	const stage = stageFromEnvironment();
	// const { Items } = event;
	const Items = [
		{ invoice_id: '8ad093179739ff4c0197439d02d77292' }, // positive
		{ invoice_id: '8ad0931796ab0aa70196b890c5561c54' }, // negative
	];
	const zuoraClient = await ZuoraClient.create(stage);

	for (const item of Items) {
		const invoiceId = item.invoice_id;
		const invoice = await getInvoice(zuoraClient, invoiceId);
		console.log(invoice);

		const { amount: invoiceAmount, balance: invoiceBalance } = invoice;

		const { invoiceItems } = await getInvoiceItems(zuoraClient, invoiceId);
		console.log(invoiceItems);

		if (invoiceBalance > 0) {
			invoiceItems.sort(
				(a, b) => b.availableToCreditAmount - a.availableToCreditAmount,
			);
		} else {
			invoiceItems.sort(
				(a, b) => a.availableToCreditAmount - b.availableToCreditAmount,
			);
		}

		let currentBalance = invoiceBalance;

		for (const item of invoiceItems) {
			const amount = Math.min(
				Math.abs(item.availableToCreditAmount),
				Math.abs(currentBalance),
			);

			const response = await creditInvoice(
				dayjs(),
				zuoraClient,
				invoiceId,
				item.id,
				amount,
				item.availableToCreditAmount > 0 ? 'Credit' : 'Charge',
				'InvoiceDetail',
				'Comment',
			);

			console.log(response);

			currentBalance -= item.availableToCreditAmount;

			if (
				(invoiceAmount > 0 && currentBalance <= 0) ||
				(invoiceAmount < 0 && currentBalance >= 0)
			) {
				break;
			}
		}

		// const payloads = buildPayloads({ invoiceItems });

		// let currentBalance = invoiceBalance;
		// const finalPayload = []

		// for (const item of payloads) {

		// }

		// let currentIndex = 0;
		// const maxIndex = payloads.length - 1;

		// let exit = false;

		// while (!exit) {
		// 	if (currentIndex > maxIndex) break;

		// 	if (currentBalance == 0) break;

		// 	const payload = payloads[currentIndex]!;
		// 	const availableToCreditAmount =
		// 		payload.Type == 'Credit' ? payload.Amount : -payload.Amount;

		// 	if (
		// 		isNextBalanceValid({
		// 			invoiceAmount,
		// 			currentBalance,
		// 			availableToCreditAmount,
		// 		})
		// 	) {

		// 		currentBalance -= availableToCreditAmount;
		// 		currentIndex++;
		// 	} else {
		// 	}
		// }

		// for (const payload of payloads) {
		// 	const availableToCreditAmount =
		// 		payload.Type == 'Credit' ? payload.Amount : -payload.Amount;

		// 	if (
		// 		isNextBalanceValid({
		// 			invoiceAmount,
		// 			currentBalance,
		// 			availableToCreditAmount,
		// 		})
		// 	) {
		// 		orderedPayloads.push(payload);
		// 		currentBalance -= availableToCreditAmount;
		// 		if (currentBalance == 0) break;
		// 	}
		// }

		// const payload = [];
		// const currentBalance = invoice.balance;
		// const invoiceItemsAddedMap: boolean[] = invoiceItems.map((item) => false);

		// for (const invoiceItem of invoiceItems) {
		// 	const { id } = invoiceItem;

		// 	if (invoiceItemsAddedMap[k]) {
		// 		continue;
		// 	}
		// }

		// const payload = invoiceItems
		// 	.filter((item) => item.availableToCreditAmount != 0)
		// 	.map((item) => ({
		// 		adjustmentDate: dayjs(),
		// 		invoiceId: invoiceId,
		// 		sourceId: item.id,
		// 		amount: Math.abs(item.availableToCreditAmount),
		// 		type: item.availableToCreditAmount > 0 ? 'Credit' : 'Charge',
		// 		sourceType: 'InvoiceDetail',
		// 		comment: '',
		// 		reasonCode: '',
		// 	}));
	}
};

// const convertInvoiceItemsToInvoiceItemAdjustmentPayloads = (
// 	invoiceItems: GetInvoiceItemsResponse['invoiceItems'],
// ) => {
// 	const payloads = [];
// };

// export const buildPayloads = ({
// 	invoiceItems,
// }: {
// 	invoiceItems: GetInvoiceItemsResponse['invoiceItems'];
// }) => {
// 	const payloads: {
// 		Amount: number;
// 		SourceId: string;
// 		SourceType: 'InvoiceDetail' | 'Tax';
// 		Type: 'Credit' | 'Charge';
// 	}[] = [];

// 	for (const invoiceItem of invoiceItems.filter(
// 		(item) => item.availableToCreditAmount != 0,
// 	)) {
// 		const { id, availableToCreditAmount } = invoiceItem;

// 		payloads.push({
// 			Amount: Math.abs(availableToCreditAmount),
// 			SourceId: id,
// 			SourceType: 'InvoiceDetail',
// 			Type: availableToCreditAmount > 0 ? 'Credit' : 'Charge',
// 		});

// 		for (const taxItem of invoiceItem.taxationItems.data.filter(
// 			(taxItem) => taxItem.availableToCreditAmount != 0,
// 		)) {
// 			const { id, availableToCreditAmount } = taxItem;

// 			payloads.push({
// 				Amount: Math.abs(availableToCreditAmount),
// 				SourceId: id,
// 				SourceType: 'Tax',
// 				Type: availableToCreditAmount > 0 ? 'Credit' : 'Charge',
// 			});
// 		}
// 	}

// 	return payloads;
// };

// export const isNextBalanceValid = ({
// 	invoiceAmount,
// 	currentBalance,
// 	availableToCreditAmount,
// }: {
// 	invoiceAmount: number;
// 	currentBalance: number;
// 	availableToCreditAmount: number;
// }) => {
// 	const nextBalance = currentBalance - availableToCreditAmount;

// 	if (invoiceAmount > 0) {
// 		if (nextBalance < 0 || nextBalance > invoiceAmount) {
// 			return false;
// 		}
// 	} else {
// 		if (nextBalance < invoiceAmount || nextBalance > 0) {
// 			return false;
// 		}
// 	}

// 	return true;
// };

// const payload = {
// 	adjustmentDate: dayjs(),
// 	invoiceId: invoiceId,
// 	sourceId: item.id,
// 	amount,
// 	type: item.availableToCreditAmount > 0 ? 'Credit' : 'Charge',
// 	sourceType: 'InvoiceDetail',
// 	comment: '',
// 	reasonCode: '',
// };
