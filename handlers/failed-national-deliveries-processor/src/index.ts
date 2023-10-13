import {Request, FileRow} from "../src/types.ts";
import {S3Ops} from "../src/s3.ts";
import {getFileContents, getFailedDeliveryRowsFromFileContents} from "./FileIO.js";
import {generateRequestsFromFailedDeliveryRows} from "./RequestBuilder.js";
// import { S3Ops } from 'common/aws/s3';


export const main = async (): Promise<string> => {
	
	// const s3Client = new S3Ops();

	const s3Client = new S3Ops('AWS_REGION');
	console.log('s3Client:',s3Client);
	// await s3Client.putObject(
	// 	config.bucketName,
	// 	'snyk/allrepos.json',
	// 	allReposAndSnykProjects,
	// );

	// const allFileRows = await getFileContents();
	// const failedDeliveryRows : FileRow[] = getFailedDeliveryRowsFromFileContents(allFileRows);		
	
	// const requests : Request[] = generateRequestsFromFailedDeliveryRows(failedDeliveryRows);
	
	// requests.forEach(
	// 	request => console.log('request: '+ JSON.stringify(request))
	// );

	return Promise.resolve('');
};

main();

