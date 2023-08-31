export type Request = {
    allOrNone: boolean
    compositeRequest: SubRequest[]
}

export type SubRequest = {
    method: string
    url: string
    referenceId: string
    body?: Body
}

export type Body = {
	Case__c?: string
	description?: string
	SF_Subscription__c?: string
	Notes__c?: string
}

type FileRow = {
	sub: string;
	"Delivery Quantity": string;
	"Delivery Date": string;
	reason_code : string;	
	"Extended Reason": string;
};