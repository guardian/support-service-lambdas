import { stageFromEnvironment } from '@modules/stage';
import { type LambdaEvent } from '../handlers/writeOffInvoices';
import { getZuoraOAuthToken } from '../services/getOAuthToken';

export type CreateInvoiceItemAdjustmentsInput = {
	invoice_balance: string;
	invoice_id: string;
	invoice_items_data: string;
	invoice_amount: string;
	cancel_source: string;
};

type InvoiceAdjustmentPayload = {
	AdjustmentDate: string;
	Amount: number;
	Comment: string;
	InvoiceId: string;
	SourceId: string;
	SourceType: 'InvoiceDetail' | 'Tax';
	Type: 'Credit' | 'Charge';
	ReasonCode?: string;
};

const errorMessagesToIgnore = [
	'Adjustment amount cannot be negative or zero.',
	'Adjustment amount is out of range. Please change the amount.',
	'You can not adjust the invoice balance from a negative amount to a positive amount.',
	'You can not adjust the invoice balance from a positive amount to a negative amount.',
];

type CancelSource = 'MMA' | 'Autocancel' | 'Salesforce';

const comments: Record<CancelSource, string> = {
	MMA: 'MMA cancellation process leaving behind positive invoices if there was a payment failure. Write-off processed for the invoices.',
	Autocancel:
		'Auto-cancel cancelling the subscription but not balancing negative and positive invoices. Write-off processed for the invoices.',
	Salesforce:
		'Invoices left over after manual cancellation made in Salesforce or Zuora UI. Write-off processed for the invoices.',
};

export const createInvoiceItemAdjustments = async (event: LambdaEvent) => {
	const failedRecords = [];
	const stage = stageFromEnvironment();
	const { Items } = event;

	console.log(JSON.stringify(Items, null, 2));

	for (const item of Items) {
		const reasonCode = 'Write-off';
		const comment = comments[item.cancel_source as CancelSource];

		if (!comment) {
			throw new Error(
				`Unknown cancel source '${item.cancel_source}'. Please add a mapping to the 'comments' object above.`,
			);
		}

		const invoiceId = item.invoice_id;
		const invoiceAmount = Number.parseFloat(item.invoice_amount);
		const invoiceBalance = Number.parseFloat(item.invoice_balance);

		const invoiceItems = item.invoice_items_data.split(',').map((str) => {
			const [
				invoiceItemAmountString,
				invoiceItemId,
				skuName,
				invoiceItemTaxAmountString,
				taxationItemId,
			] = str.split('!!!') as [string, string, string, string, string];

			return {
				invoiceItemAmount: Number.parseFloat(invoiceItemAmountString),
				invoiceItemTaxAmount: Number.parseFloat(invoiceItemTaxAmountString),
				invoiceItemId,
				skuName,
				taxationItemId,
			};
		});

		const payloads = [];

		for (let j = 0; j < invoiceItems.length; j++) {
			const {
				invoiceItemId,
				invoiceItemAmount,
				invoiceItemTaxAmount,
				taxationItemId,
			} = invoiceItems[j] as {
				invoiceItemId: string;
				invoiceItemAmount: number;
				invoiceItemTaxAmount: number;
				taxationItemId: string;
			};

			const chargeAmountPayload: InvoiceAdjustmentPayload = {
				AdjustmentDate: new Date().toISOString().split('T')[0] ?? '',
				Amount: Math.abs(invoiceItemAmount),
				Comment: comment,
				InvoiceId: invoiceId,
				SourceId: invoiceItemId,
				SourceType: 'InvoiceDetail',
				Type: invoiceItemAmount > 0 ? 'Credit' : 'Charge',
				ReasonCode: reasonCode,
			};

			payloads.push(chargeAmountPayload);

			if (Math.abs(invoiceItemTaxAmount) > 0) {
				const taxAmountPayload = {
					AdjustmentDate: new Date().toISOString().split('T')[0],
					Amount: Math.abs(invoiceItemTaxAmount),
					Comment: comment,
					InvoiceId: invoiceId,
					SourceId: taxationItemId,
					SourceType: 'Tax',
					Type: invoiceItemTaxAmount > 0 ? 'Credit' : 'Charge',
					ReasonCode: reasonCode,
				};
				payloads.push(taxAmountPayload);
			}
		}

		const orderedItems = [];
		const payloadsCompletedArr: boolean[] = payloads.map(() => false);
		let currentBalance = invoiceBalance;
		let completed = false;

		const roundToTwo = (num: number) => Math.round(num * 100) / 100;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- comment
		while (!completed) {
			for (let k = 0; k < payloads.length; k++) {
				if (payloadsCompletedArr[k]) {
					continue;
				}

				if (roundToTwo(currentBalance) == 0) {
					break;
				}

				const item = payloads[k] as InvoiceAdjustmentPayload;

				const diff = item.Type == 'Charge' ? item.Amount : -item.Amount;
				const newBalance = currentBalance + diff;

				if (
					(newBalance <= 0 && currentBalance >= 0) ||
					(newBalance >= 0 && currentBalance <= 0)
				) {
					item.Amount = Math.abs(currentBalance);
					orderedItems.push(item);
					payloadsCompletedArr[k] = true;
					break;
				}

				if (
					(invoiceAmount > 0 &&
						roundToTwo(newBalance) >= 0 &&
						roundToTwo(newBalance) <= roundToTwo(invoiceAmount)) ||
					(invoiceAmount < 0 &&
						roundToTwo(newBalance) <= 0 &&
						roundToTwo(newBalance) >= roundToTwo(invoiceAmount))
				) {
					orderedItems.push(item);
					payloadsCompletedArr[k] = true;
					currentBalance = newBalance;
				}
			}

			if (payloadsCompletedArr.filter((item) => !item).length == 0) {
				completed = true;
			}
			break;
		}

		console.log(orderedItems);

		for (
			let chunkIndex = 0;
			chunkIndex < orderedItems.length;
			chunkIndex += 50
		) {
			const chunk = orderedItems.slice(chunkIndex, chunkIndex + 50);

			try {
				const accessToken = await getZuoraOAuthToken({ stage });

				const domain = {
					CODE: `https://rest.apisandbox.zuora.com`,
					CSBX: `https://rest.test.zuora.com`,
					PROD: `https://rest.zuora.com`,
				};

				const response = await fetch(`${domain[stage]}/v1/action/create`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						objects: chunk,
						type: 'InvoiceItemAdjustment',
					}),
				});

				if (response.ok) {
					const responseData = (await response.json()) as Array<{
						Id: string;
						Success: boolean;
						Errors?: Array<{ Code: string; Message: string }>;
					}>;
					console.log(JSON.stringify(responseData, null, 2));

					responseData.forEach((item) => {
						if (!item.Success) {
							if (
								(item.Errors ?? []).filter(
									(error) => !errorMessagesToIgnore.includes(error.Message),
								).length == 0
							) {
								// Ignore error
							} else {
								failedRecords.push({
									invoice_id: invoiceId,
									error: (item.Errors ?? [])
										.map((error) => `${error.Code}: ${error.Message}`)
										.join(', '),
								});
								console.error(
									`Invoice ${invoiceId} failed: ${JSON.stringify(
										item.Errors,
										null,
										2,
									)}`,
								);
							}
						}
					});
				} else {
					const errorData = await response.json();
					failedRecords.push({
						invoice_id: invoiceId,
						error: JSON.stringify(errorData, null, 2),
					});
					console.error(
						'Failed to process invoice:',
						JSON.stringify(errorData, null, 2),
					);
				}
			} catch (error) {
				console.error('Error during API call:', error);
				failedRecords.push({ invoice_id: invoiceId, error: String(error) });
			}
		}
	}

	if (failedRecords.length > 0) {
		console.error(failedRecords);
		throw new Error(JSON.stringify(failedRecords));
	}
};
