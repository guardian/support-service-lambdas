import { parse } from 'csv-parse/sync';

interface AccountRow {
	Id: string;
	Zuora__Zuora_Id__c: string;
	Zuora__Account__c: string;
	Contact__c: string;
}

export const convertCsvToAccountRows = ({
	csvString,
}: {
	csvString: string;
}): AccountRow[] => {
	const csvRows = parse(csvString, {
		columns: true,
		skip_empty_lines: true,
	}) as AccountRow[];

	return csvRows;
};
