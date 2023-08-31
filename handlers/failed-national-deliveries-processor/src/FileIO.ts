import fs from 'fs';
import { parse } from 'csv-parse/sync';
import {FileRow} from "./types.js";

export async function getFileContents(){
	return parse(
		fs.readFileSync('./gnm_failed_deliveries_11_07_23.csv', 'utf-8'), 
		{columns: true, skip_empty_lines: true}
	);
}

export function getFailedDeliveryRowsFromFile(fileRows : FileRow[]) : FileRow[]{
	
	const failedDeliveryRows : FileRow[] = fileRows.filter(
		record=>record.reason_code==='F'
	);

	return failedDeliveryRows;
}