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
	SubscriptionNumber__c: string;
	PaymentId__c: string;
	AccountId__c: string;
	InvoiceId__c: string;
}
