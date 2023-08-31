import fs from 'fs';
import { parse } from 'csv-parse/sync';

export const main = async (): Promise<string> => {
		
		const records : FileRow[] = await getFileRows();
		
		const recordsForCompositeJson : FileRow[] = records.filter(
			record=>record.reason_code==='F'
		);
		
		const json = generateJson(recordsForCompositeJson);
		
		console.log('json:',json);
	
	return Promise.resolve('');
};

function generateJson(recordsForCompositeJson : FileRow[]) : string {
	
	var compositeRequests : SubRequest[] = [];

	recordsForCompositeJson.forEach(
		record => {
			compositeRequests.push(createJsonForPatchDeliveryWithNotes(record.sub, record['Delivery Date']))
			compositeRequests.push(createJsonForGetSFSubFromDelivery(record.sub, record['Delivery Date']))
			compositeRequests.push(createJsonForCreateCase(record.sub, record['Delivery Date']))
			compositeRequests.push(createJsonForUpdateDeliveryWithCase(record.sub, record['Delivery Date']))
		}
	); 
	
	return JSON.stringify({
		allOrNone:true, 
		compositeRequest:compositeRequests
	});
}

function createJsonForPatchDeliveryWithNotes(subName:string, deliveryDate:string) : SubRequest {
	const compositeKey : string = generateCompositeKey(subName, deliveryDate);
	const deliveryUpdateUrl : string = generateDeliveryUpdateUrl(compositeKey);
	const referenceId = 'UpdateDeliveryNotes_'+compositeKey.replace('A-S', '').replaceAll('-', '_');

	return {
		method : 'PATCH',
		url : deliveryUpdateUrl,
		referenceId : referenceId,
		body : {Notes__c : 'updating ' + compositeKey}
	}
}

function createJsonForGetSFSubFromDelivery(subName:string, deliveryDate:string) : SubRequest{
	const compositeKey : string = generateCompositeKey(subName, deliveryDate);
	return {
		method : 'GET',
		referenceId : "GetDelivery_"+compositeKey.replace('A-S', '').replaceAll('-', '_'),
        url : "/services/data/v58.0/sobjects/Delivery__c/@{UpdateDeliveryNotes_"+compositeKey.replace('A-S', '').replaceAll('-', '_')+".id}?fields=SF_Subscription__c",
	}
}

function createJsonForCreateCase(subName:string, deliveryDate:string) : SubRequest {
	const compositeKey : string = generateCompositeKey(subName, deliveryDate);
	return {
        method : "POST",
        referenceId : "CreateCase_"+compositeKey.replace('A-S', '').replaceAll('-', '_'),
        url : "/services/data/v58.0/sobjects/Case",
        body : {  
            description : "Case from composite api",
            SF_Subscription__c : "@{GetDelivery_"+compositeKey.replace('A-S', '').replaceAll('-', '_')+".SF_Subscription__c}"
        }
    }
}

function createJsonForUpdateDeliveryWithCase(subName:string, deliveryDate:string) : SubRequest {
	const compositeKey : string = generateCompositeKey(subName, deliveryDate);
	const deliveryUpdateUrl : string = generateDeliveryUpdateUrl(compositeKey);
	return {
        method : "PATCH",
        url : deliveryUpdateUrl,
        referenceId : "UpdateDeliveryCase_"+compositeKey.replace('A-S', '').replaceAll('-', '_'),
        body : {  
            Case__c : "@{CreateCase_"+compositeKey.replace('A-S', '').replaceAll('-', '_')+".id}"
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

function generateCompositeJson(records: string[]){
	// var myArray :string[] = [];

	// for (const record of records){
	// 	console.log('record:',record);
	// 	if(record.reason_code){

	// 	}
	// 	myArray.push(record);
	// }
	// console.log('myArray:',myArray);

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

