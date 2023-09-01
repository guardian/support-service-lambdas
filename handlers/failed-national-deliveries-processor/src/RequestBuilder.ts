import { Request, SubRequest, FileRow } from "./types";

export function generateRequestsFromFailedDeliveryRows(failedDeliveryRows : FileRow[]) : Request[] {
	return failedDeliveryRows.map(generateRequest);
}

function generateRequest(fileRow : FileRow) : Request {
	
	var compositeRequests : SubRequest[] = [];
	const compositeKey : string = generateCompositeKey(fileRow.sub, fileRow['Delivery Date']);

	compositeRequests.push(createJsonForPatchDeliveryWithNotes(fileRow.sub, fileRow['Delivery Date'], compositeKey))
	compositeRequests.push(createJsonForGetSFSubFromDelivery(fileRow.sub, fileRow['Delivery Date'], compositeKey))
	compositeRequests.push(createJsonForCreateCase(fileRow.sub, fileRow['Delivery Date'], compositeKey))
	compositeRequests.push(createJsonForUpdateDeliveryWithCase(fileRow.sub, fileRow['Delivery Date'], compositeKey))
	
	return {
		allOrNone:true, 
		compositeRequest:compositeRequests
	};
}

function createJsonForPatchDeliveryWithNotes(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	return {
		method : 'PATCH',
		url : generateDeliveryUpdateUrl(compositeKey),
		referenceId : generateReferenceId('UpdateDeliveryNotes_', removeInvalidCharsForReferenceId(compositeKey)),
		body : {Notes__c : 'updating ' + compositeKey}
	}
}

function createJsonForGetSFSubFromDelivery(subName:string, deliveryDate:string, compositeKey:string) : SubRequest{
	return {
		method : 'GET',
        url : "/services/data/v58.0/sobjects/Delivery__c/@{"+generateReferenceId('UpdateDeliveryNotes_', removeInvalidCharsForReferenceId(compositeKey))+".id}?fields=SF_Subscription__c",
		referenceId : generateReferenceId('GetDelivery_', removeInvalidCharsForReferenceId(compositeKey))
	}
}

function createJsonForCreateCase(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	return {
        method : "POST",
        url : "/services/data/v58.0/sobjects/Case",
        referenceId : generateReferenceId('CreateCase_', removeInvalidCharsForReferenceId(compositeKey)),
        body : {  
            description : "Case from composite api",
            SF_Subscription__c : "@{"+generateReferenceId('GetDelivery_', removeInvalidCharsForReferenceId(compositeKey))+".SF_Subscription__c}"
        }
    }
}

function createJsonForUpdateDeliveryWithCase(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	return {
        method : "PATCH",
        url : generateDeliveryUpdateUrl(compositeKey),
		referenceId : generateReferenceId('UpdateDeliveryCase_', removeInvalidCharsForReferenceId(compositeKey)),
        body : {  
            Case__c : "@{"+generateReferenceId('CreateCase_', removeInvalidCharsForReferenceId(compositeKey))+".id}"
        }
    }
}

function generateDeliveryUpdateUrl(compositeKey : string) : string {
	return '/services/data/v58.0/sobjects/Delivery__c/Composite_Key__c/'+compositeKey;
}

function generateCompositeKey(subName : string, deliveryDate : string) : string {
	const year = deliveryDate.substring(6,10);
	const month = deliveryDate.substring(3,5);
	const day = deliveryDate.substring(0,2);
	return subName + '-' + year + '-' + month + '-' + day;
}

function generateReferenceId(prefix : string, compositeKey:string) : string {
	return prefix + removeInvalidCharsForReferenceId(compositeKey);
}
function removeInvalidCharsForReferenceId(compositeKey:string) : string {
	return compositeKey.replaceAll('-', '_');
}