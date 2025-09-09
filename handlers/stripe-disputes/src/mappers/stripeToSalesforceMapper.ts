import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../dtos';
import {
	timestampToSalesforceDate,
	timestampToSalesforceDateTime,
} from '../helpers';
import type {
	PaymentDisputeRecord,
	ZuoraInvoiceFromStripeChargeIdResult,
} from '../interfaces';

/**
 * Maps Stripe dispute webhook data to Salesforce Payment Dispute record format
 *
 * This function transforms Stripe webhook data into the format expected by Salesforce,
 * with optional enrichment from Zuora data for subscription and billing information.
 * Handles both dispute created and dispute closed events.
 *
 * @param stripeData - Stripe webhook payload (created or closed dispute event)
 * @param zuoraData - Optional Zuora data to enrich the record with billing information
 * @returns Salesforce Payment Dispute record ready for upsert
 */
export function mapStripeDisputeToSalesforce(
	stripeData: ListenDisputeCreatedRequestBody | ListenDisputeClosedRequestBody,
	zuoraData?: ZuoraInvoiceFromStripeChargeIdResult,
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
		Amount__c: dispute.amount / 100,
		Evidence_Due_Date__c: timestampToSalesforceDate(
			dispute.evidence_details.due_by,
		),
		Payment_Intent_ID__c: dispute.payment_intent,
		Network_Reason_Code__c:
			dispute.payment_method_details.card.network_reason_code,
		Is_Charge_Refundable__c: dispute.is_charge_refundable,
		Created_Date__c: timestampToSalesforceDateTime(dispute.created),
		Has_Evidence__c: dispute.evidence_details.has_evidence,
		SubscriptionNumber__c: zuoraData?.SubscriptionNumber ?? '',
		PaymentId__c: zuoraData?.paymentId ?? '',
		Billing_AccountId__c: zuoraData?.paymentAccountId ?? '',
		InvoiceId__c: zuoraData?.InvoiceId ?? '',
	};
}
