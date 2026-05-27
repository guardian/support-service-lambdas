export interface ZoqlExportQuery {
	name: string;
	query: string;
	type: 'zoqlexport';
}

export interface BatchQueryRequest {
	partner: string;
	incrementalTime?: string;
	name: string;
	queries: ZoqlExportQuery[];
	format: 'csv';
	version: '1.1';
	project: 'supporter-product-data';
	encrypted: 'none';
	useQueryLabels: 'true';
	dateTimeUtc: 'true';
}
