import { Lazy } from '@modules/lazy';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import type { SwitchMode } from '../schemas';

// TODO use central eligibility checker pattern
export function isGenerallyEligibleForDiscount(
	subscriptionStatus: string,
	mode: SwitchMode,
	totalInvoiceBalance: number,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
): Lazy<boolean> {
	if (
		subscriptionStatus === 'Active' &&
		mode === 'save' &&
		totalInvoiceBalance === 0
	) {
		return lazyBillingPreview.then((nextInvoiceItems) => {
			const hasUpcomingDiscount = nextInvoiceItems.some(
				(invoiceItem) => invoiceItem.amount < 0,
			);

			return !hasUpcomingDiscount;
		});
	}
	return new Lazy(() => Promise.resolve(false), 'not eligible for discount');
}
