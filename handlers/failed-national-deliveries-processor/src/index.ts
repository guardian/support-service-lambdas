import fs from 'fs';
import { parse } from 'csv-parse/sync';

export const main = async (): Promise<string> => {
		
		const failedDeliveryRows : FileRow[] = getFailedDeliveryRowsFromFile();		
		var requests : Request[] = generateRequestsFromFailedDeliveryRows(failedDeliveryRows);
		
		console.log('requests:', JSON.stringify(requests));
	
	return Promise.resolve('');
};

function generateRequestsFromFailedDeliveryRows(failedDeliveryRows : FileRow[]) : Request[] {
	var requests : Request[] = [];
		
	failedDeliveryRows.map(
		failedDeliveryRow => requests.push(generateRequest(failedDeliveryRow))
	);

	return requests;
}

function getFailedDeliveryRowsFromFile() : FileRow[]{
	const records : FileRow[] = await getFileRows();
		
	const fileRows : FileRow[] = records.filter(
		record=>record.reason_code==='F'
	);

	return fileRows;
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
		referenceId : generateReferenceId('GetDelivery_', removeInvalidCharsForReferenceId(compositeKey)),
        url : "/services/data/v58.0/sobjects/Delivery__c/@{UpdateDeliveryNotes_"+compositeKey.replace('A-S', '').replaceAll('-', '_')+".id}?fields=SF_Subscription__c",
	}
}

function createJsonForCreateCase(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	return {
        method : "POST",
        referenceId : generateReferenceId('CreateCase_', removeInvalidCharsForReferenceId(compositeKey)),
        url : "/services/data/v58.0/sobjects/Case",
        body : {  
            description : "Case from composite api",
            SF_Subscription__c : "@{GetDelivery_"+compositeKey.replace('A-S', '').replaceAll('-', '_')+".SF_Subscription__c}"
        }
    }
}

function createJsonForUpdateDeliveryWithCase(subName:string, deliveryDate:string, compositeKey:string) : SubRequest {
	const deliveryUpdateUrl : string = generateDeliveryUpdateUrl(compositeKey);
	return {
        method : "PATCH",
        url : deliveryUpdateUrl,
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


async function getFileRows(){
	return parse(
		fs.readFileSync('./gnm_failed_deliveries_11_07_23.csv', 'utf-8'), 
		{columns: true, skip_empty_lines: true}
	);
}

type FileRow = {
	sub: string;
	"Delivery Quantity": string;
	"Delivery Date": string;
	reason_code : string;	
	"Extended Reason": string;
};

type DeliveryUpdate = {
	compositeKey: string;
};

type Request = {
    allOrNone: boolean
    compositeRequest: SubRequest[]
}

type SubRequest = {
    method: string
    url: string
    referenceId: string
    body?: Body
}

type Body = {
	Case__c?: string
	description?: string
	SF_Subscription__c?: string
	Notes__c?: string
}

main();

