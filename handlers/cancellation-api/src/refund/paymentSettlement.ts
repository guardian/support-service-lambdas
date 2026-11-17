/**
 * Decides whether the payment for an invoice has settled, so the workflow knows whether to refund, keep waiting,
 * or treat it as failed.
 *
 * Direct Debit payments stay Processed while the bank collects them: only GatewayState shows whether they have
 * settled or failed. Card payments are settled once Processed.
 */

export type PaymentSettlementStatus = 'Settled' | 'Pending' | 'Failed';

export type SettlementPayment = {
	status: string;
	gatewayState: string;
	paymentMethodType: string;
};

const directDebitPaymentMethodType = 'BankTransfer';

export function getPaymentSettlementStatus({
	invoiceAmount,
	invoiceBalance,
	latestPayment,
}: {
	invoiceAmount: number;
	invoiceBalance: number;
	latestPayment: SettlementPayment | undefined;
}): PaymentSettlementStatus {
	if (invoiceAmount === 0) {
		return 'Settled';
	}
	if (latestPayment === undefined) {
		return invoiceBalance > 0 ? 'Pending' : 'Settled';
	}
	const { status, gatewayState, paymentMethodType } = latestPayment;
	switch (status) {
		case 'Error':
			return 'Failed';
		case 'Processing':
			return 'Pending';
		case 'Processed':
			return paymentMethodType === directDebitPaymentMethodType
				? getDirectDebitSettlementStatus(gatewayState)
				: 'Settled';
		default:
			throw new Error(`Unexpected payment status ${status}`);
	}
}

function getDirectDebitSettlementStatus(
	gatewayState: string,
): PaymentSettlementStatus {
	switch (gatewayState) {
		case 'Settled':
			return 'Settled';
		case 'Submitted':
			return 'Pending';
		case 'FailedToSettle':
			return 'Failed';
		default:
			throw new Error(
				`Unexpected gateway state ${gatewayState} for a processed Direct Debit payment`,
			);
	}
}
