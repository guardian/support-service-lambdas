import type { DataExtensionName } from '@modules/email/email';

export type EligibilityCheck =
	| 'EligibleForFreePeriod'
	| 'AtCatalogPrice'
	| 'NoRepeats'
	| 'NoCheck';
export type Discount = {
	// the following fields match the charge in the zuora catalog
	// https://knowledgecenter.zuora.com/Zuora_Platform/API/G_SOAP_API/E1_SOAP_API_Object_Reference/ProductRatePlanCharge
	productRatePlanId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Days' | 'Weeks' | 'Months' | 'Years';
	discountPercentage: number;
	// end fields that match the zuora catalog
	emailIdentifier: DataExtensionName;
	eligibilityCheckForRatePlan: EligibilityCheck;
};
