import {Request, FileRow} from "../src/types.ts";
import {getFileContents, getFailedDeliveryRowsFromFile} from "./FileIO.js";
import {generateRequestsFromFailedDeliveryRows} from "./RequestBuilder.js";

export const main = async (): Promise<string> => {
	
	const allFileRows = await getFileContents();
	const failedDeliveryRows : FileRow[] = getFailedDeliveryRowsFromFile(allFileRows);		
	var requests : Request[] = generateRequestsFromFailedDeliveryRows(failedDeliveryRows);
	
	requests.forEach(
		request => console.log('request: '+ JSON.stringify(request))
	);

	return Promise.resolve('');
};

main();

