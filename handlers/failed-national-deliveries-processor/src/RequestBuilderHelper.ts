import { Config } from './Config';
const apiPath = '/services/data/'+new Config().sfApiVersion+'/sobjects';

export function generateUpdateDeliveryUrl(compositeKey : string) : string {
    return apiPath + '/Delivery__c/Composite_Key__c/'+compositeKey;
}

export function generateGetDeliveryUrl(compositeKey:string){
	return apiPath + "/Delivery__c/@{"+generateReferenceId('UpdateDeliveryNotes_', removeInvalidCharsForReferenceId(compositeKey))+".id}?fields=SF_Subscription__c";
}

export function generateCreateCaseUrl(){
	return apiPath + "/Case";
}

export function generateCompositeKey(subName : string, deliveryDate : string) : string {
	const year = deliveryDate.substring(6,10);
	const month = deliveryDate.substring(3,5);
	const day = deliveryDate.substring(0,2);
	return subName + '-' + year + '-' + month + '-' + day;
}

export function generateReferenceId(prefix : string, compositeKey:string) : string {
	return prefix + removeInvalidCharsForReferenceId(compositeKey);
}

export function removeInvalidCharsForReferenceId(compositeKey:string) : string {
	return compositeKey.replaceAll('-', '_');
}