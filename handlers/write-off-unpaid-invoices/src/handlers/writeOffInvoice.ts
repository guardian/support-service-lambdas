import { stageFromEnvironment } from '@modules/stage';
import { getZuoraOAuthToken } from '../services/getOAuthToken';

type InvoiceDateInput = {
	accounting_code_project_codes: string;
	product_rate_plan_analysis_codes: string;
	account_id: string;
	subscription_number: string;
	contact_sold_to_country: string;
	invoice_balance: string;
	invoice_id: string;
	invoice_items_data: string;
	product_rate_plan_charge_product_codes: string;
	invoice_currency: string;
	invoice_amount: string;
	invoice_date: string;
};

type InvoiceAdjustmentPayload = {
	AdjustmentDate: string;
	Amount: number;
	Comments: string;
	InvoiceId: string;
	SourceId: string;
	SourceType: 'InvoiceDetail' | 'Tax';
	Type: 'Credit' | 'Charge';
	ReasonCode?: string;
};

const comment =
	'Auto-cancel cancelling the subscription but not balancing negative and positive invoices. Write-off processed for the invoices.';

const reasonCode = undefined;

export const handler = async (event: { Items: InvoiceDateInput[] }) => {
	const failedRecords = [];
	const stage = stageFromEnvironment();
	const { Items } = event;
	console.log(event);

	for (const item of Items) {
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
				Comments: comment,
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
					Comments: comment,
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

		while (!completed) {
			if (roundToTwo(currentBalance) == 0) {
				break;
			}

			for (let k = 0; k < payloads.length; k++) {
				if (payloadsCompletedArr[k]) {
					continue;
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

				// console.log(item);
				// console.log(invoiceAmount);
				// console.log(invoiceBalance);
				// console.log(newBalance);
				// console.log(payloadsCompletedArr);

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
		}

		console.log(orderedItems);

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
					objects: orderedItems,
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

	if (failedRecords.length > 0) {
		throw new Error(JSON.stringify(failedRecords));
	}
};
