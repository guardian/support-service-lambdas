import type { ListenDisputeCreatedRequestBody } from '../requestSchema';

export interface PaymentDisputeRecord {
	attributes: {
		type: string;
	};
	Dispute_ID__c: string;
	Charge_ID__c: string;
	Reason__c: string;
	Status__c: string;
	Amount__c: number;
	Evidence_Due_Date__c: string; // ISO date string
	Payment_Intent_ID__c: string;
	Network_Reason_Code__c: string;
	Is_Charge_Refundable__c: boolean;
	Created_Date__c: string; // ISO datetime string
	Has_Evidence__c: boolean;
}

/**
 * Converts a Unix timestamp to ISO datetime string for Salesforce
 */
function timestampToSalesforceDateTime(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString();
}

/**
 * Converts a Unix timestamp to ISO date string for Salesforce
 */
function timestampToSalesforceDate(timestamp: number): string {
	const date: string | undefined = new Date(timestamp * 1000)
		.toISOString()
		.split('T')[0];
	if (!date) {
		throw new Error(`Invalid timestamp: ${timestamp}`);
	}
	return date;
}

/**
 * Maps Stripe dispute webhook data to Salesforce Payment Dispute record format
 */
export function mapStripeDisputeToSalesforce(
	stripeData: ListenDisputeCreatedRequestBody,
): PaymentDisputeRecord {
	const dispute = stripeData.data.object;

	return {
		attributes: {
			type: 'Payment_Dispute__c',
		},
		Dispute_ID__c: dispute.id,
		Charge_ID__c: dispute.charge,
		Reason__c: dispute.reason,
		Status__c: dispute.status,
		Amount__c: dispute.amount / 100, // Convert cents to dollars
		Evidence_Due_Date__c: timestampToSalesforceDate(
			dispute.evidence_details.due_by,
		),
		Payment_Intent_ID__c: dispute.payment_intent,
		Network_Reason_Code__c:
			dispute.payment_method_details.card.network_reason_code,
		Is_Charge_Refundable__c: dispute.is_charge_refundable,
		Created_Date__c: timestampToSalesforceDateTime(dispute.created),
		Has_Evidence__c: dispute.evidence_details.has_evidence,
	};
}
