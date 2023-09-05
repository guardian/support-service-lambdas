import { Request, SubRequest, FileRow } from "./types";
import { generateUpdateDeliveryUrl, generateGetDeliveryUrl, generateCreateCaseUrl, generateCompositeKey, generateReferenceId, removeInvalidCharsForReferenceId } from "./RequestBuilderHelper";

export function generateRequestsFromFailedDeliveryRows(failedDeliveryRows : FileRow[]) : Request[] {
	return failedDeliveryRows.map(generateRequest);
}

function generateRequest(fileRow : FileRow) : Request {
	const compositeKey : string = generateCompositeKey(fileRow["Customer Reference"], fileRow['Delivery Date']);
	return {
		allOrNone: true, 
		compositeRequest: [
			createJsonForPatchDeliveryWithNotes(fileRow["Customer Reference"], fileRow['Delivery Date'], compositeKey),
			createJsonForGetSFSubFromDelivery(fileRow["Customer Reference"], fileRow['Delivery Date'], compositeKey),
			createJsonForCreateCase(fileRow["Customer Reference"], fileRow['Delivery Date'], compositeKey),
			createJsonForUpdateDeliveryWithCase(fileRow["Customer Reference"], fileRow['Delivery Date'], compositeKey),
		],
	};
}

function createJsonForPatchDeliveryWithNotes(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	return {
		method : 'PATCH',
		url : generateUpdateDeliveryUrl(compositeKey),
		referenceId : generateReferenceId('UpdateDeliveryNotes_', removeInvalidCharsForReferenceId(compositeKey)),
		body : {Notes__c : 'updating ' + compositeKey}
	}
}

function createJsonForGetSFSubFromDelivery(subName:string, deliveryDate:string, compositeKey:string) : SubRequest{
	return {
		method : 'GET',
        url : generateGetDeliveryUrl(compositeKey),
		referenceId : generateReferenceId('GetDelivery_', removeInvalidCharsForReferenceId(compositeKey))
	}
}

function createJsonForCreateCase(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	return {
        method : "POST",
        url : generateCreateCaseUrl(),
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
        url : generateUpdateDeliveryUrl(compositeKey),
		referenceId : generateReferenceId('UpdateDeliveryCase_', removeInvalidCharsForReferenceId(compositeKey)),
        body : {  
            Case__c : "@{"+generateReferenceId('CreateCase_', removeInvalidCharsForReferenceId(compositeKey))+".id}"
        }
    }
}