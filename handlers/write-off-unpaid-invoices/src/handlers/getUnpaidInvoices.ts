import { uploadFileToS3 } from '@modules/aws/s3';
// import { getSSMParam } from '@modules/aws/ssm';
// import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';

export const handler = async ({ filePath }: { filePath: string }) => {
	// const gcpConfig = await getSSMParam(
	// 	process.env.GCP_CREDENTIALS_CONFIG_PARAMETER_NAME!,
	// );

	// const authClient = await buildAuthClient(gcpConfig);

	// const query = ``;
	// const result = await runQuery(authClient, process.env.GCP_PROJECT_ID!, query);

	// console.log('result', result);

	const result = `invoice_id,invoice_number,invoice_amount,invoice_balance,invoice_currency,invoice_date,account_id,contact_sold_to_country,product_rate_plan_charge_product_codes,product_rate_plan_analysis_codes,accounting_code_project_codes,invoice_items_data\n
xxx,INVxxx,6.0,0.0,GBP,2024-04-05,8a129e72xxx,United Kingdom,P1010,A101,0000,6!!!8a1282d6xxx!!!ABC-000xxx`;

	const s3UploadAttempt = await uploadFileToS3({
		bucketName: process.env.BUCKET_NAME!,
		filePath,
		content: JSON.stringify(result, null, 2),
	});

	if (s3UploadAttempt.$metadata.httpStatusCode !== 200) {
		throw new Error('Failed to upload to S3');
	}
};
