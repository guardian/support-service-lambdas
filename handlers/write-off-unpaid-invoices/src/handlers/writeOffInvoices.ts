import dayjs from 'dayjs';
import { stageFromEnvironment } from '@modules/stage';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type GetInvoiceItemsResponse,
	type GetInvoiceResponse,
	type InvoiceItemAdjustmentSourceType,
	type ZuoraAccount,
} from '@modules/zuora/zuoraSchemas';
import { getAccount } from '@modules/zuora/account';

export type CancelSource = 'MMA' | 'Autocancel' | 'Salesforce';

export type LambdaEvent = {
	Items: {
		invoice_id: string;
		cancel_source: CancelSource;
		invoice_number: string;
	}[];
};

type AdjustableItem = {
	id: string;
	sourceType: InvoiceItemAdjustmentSourceType;
	availableToCreditAmount: number;
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
		try {
			console.log(`Processing invoice ${invoiceId} from ${cancelSource}`);
			const invoiceData: GetInvoiceResponse = await getInvoice(
				zuoraClient,
				invoiceId,
			);
			let { balance } = invoiceData;

			console.log(`Invoice ${invoiceId} found with balance: ${balance}`);

			// Step 1: Exit if invoice balance is already zero
			if (balance == 0) {
				console.log(`Invoice ${invoiceId} already has zero balance, skipping`);
				continue;
			}

			// Step 2: Get account and check credit balance
			const account: ZuoraAccount = await getAccount(
				zuoraClient,
				invoiceData.accountId,
			);
			const { creditBalance } = account.metrics;
			console.log(`Account has credit balance: ${creditBalance}`);

			// Step 3: If invoice is positive AND account has credit balance, apply credit adjustment
			if (balance > 0 && creditBalance > 0) {
				const adjustmentAmount = Math.min(balance, creditBalance);

				console.log(
					`Applying credit balance adjustment of ${adjustmentAmount} to invoice ${invoiceId}`,
				);

				// Create credit balance adjustment (decrease type)
				await applyCreditToAccountBalance(
					zuoraClient,
					JSON.stringify({
						AdjustmentDate: dayjs().format('YYYY-MM-DD'),
						Amount: adjustmentAmount,
						Type: 'Decrease',
						SourceTransactionNumber: invoice.invoice_number,
						Comment: `${cancelSourceToCommentMap[cancelSource as CancelSource]} - Credit balance applied to invoice.`,
					}),
				);

				// Update current balance after credit adjustment
				balance -= adjustmentAmount;
				console.log(`Remaining balance after credit adjustment: ${balance}`);

				// Step 3a: Exit if invoice balance is now zero after credit adjustment
				if (balance == 0) {
					console.log(
						`Invoice ${invoiceId} fully balanced by credit, no further adjustments needed`,
					);
					continue;
				}
			} else {
				console.log(
					`No credit balance application: balance=${balance}, creditBalance=${creditBalance}`,
				);
			}

			// Step 4: Get invoice items for remaining balance adjustment
			console.log(
				`Getting invoice items for remaining balance adjustment: ${balance}`,
			);
			const { invoiceItems } = await getInvoiceItems(zuoraClient, invoiceId);
			const adjustableItems = getAdjustableItems({ invoiceItems });
			const sortedAdjustableItems = sortAdjustableItems({
				adjustableItems,
				balance,
			});

			// Step 5: Adjust invoice items until balance is zero
			let currentBalance = balance;

			for (const item of sortedAdjustableItems) {
				const adjustmentAmount = Math.min(
					Math.abs(item.availableToCreditAmount),
					Math.abs(currentBalance),
				);

				await creditInvoice(
					dayjs(),
					zuoraClient,
					invoiceId,
					item.id,
					adjustmentAmount,
					item.availableToCreditAmount > 0 ? 'Credit' : 'Charge',
					item.sourceType,
					cancelSourceToCommentMap[cancelSource as CancelSource],
					'Write-off',
				);

				currentBalance -= adjustmentAmount * (currentBalance > 0 ? 1 : -1);

				if (currentBalance == 0) break;
			}

			console.log(`Successfully processed invoice ${invoiceId}`);
		} catch (error) {
			console.error(`Error processing invoice ${invoiceId}:`, error);

			// Check if it's a "Cannot find entity" error
			if (
				error instanceof Error &&
				error.message.includes('Cannot find entity')
			) {
				console.warn(
					`Invoice ${invoiceId} not found in Zuora. This may be due to:`,
				);
				console.warn(`- Environment mismatch (PROD vs CODE/Sandbox)`);
				console.warn(`- Invoice was deleted or archived`);
				console.warn(`- Insufficient API permissions`);
				console.warn(`- Recent invoice not yet synchronized`);
				console.warn(`Skipping this invoice and continuing with others ...`);
				continue; // Skip this invoice but continue with others
			}

			// For other errors, log and continue
			console.error(`Unexpected error for invoice ${invoiceId}, skipping...`);
			continue;
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
			availableToCreditAmount: invoiceItem.availableToCreditAmount,
		};

		const taxationEntries = invoiceItem.taxationItems.data.map((taxItem) => ({
			id: taxItem.id,
			sourceType: 'Tax' as InvoiceItemAdjustmentSourceType,
			availableToCreditAmount: taxItem.availableToCreditAmount,
		}));

		return [invoiceEntry, ...taxationEntries].filter(
			(item) => item.availableToCreditAmount != 0,
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
		adjustableItems.sort(
			(a, b) => b.availableToCreditAmount - a.availableToCreditAmount,
		);
	} else {
		adjustableItems.sort(
			(a, b) => a.availableToCreditAmount - b.availableToCreditAmount,
		);
	}

	return adjustableItems;
};
