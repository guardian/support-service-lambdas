import {Request, FileRow} from "../src/types.ts";
import {getFileContents, getFailedDeliveryRowsFromFileContents} from "./FileIO.js";
import {generateRequestsFromFailedDeliveryRows} from "./RequestBuilder.js";

export const main = async (): Promise<string> => {
	
	const allFileRows = await getFileContents();
	const failedDeliveryRows : FileRow[] = getFailedDeliveryRowsFromFileContents(allFileRows);		
	var requests : Request[] = generateRequestsFromFailedDeliveryRows(failedDeliveryRows);
	
	requests.forEach(
		request => console.log('request: '+ JSON.stringify(request))
	);

	return Promise.resolve('');
};

main();

