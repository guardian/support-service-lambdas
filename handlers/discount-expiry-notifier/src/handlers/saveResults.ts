import { convertArrayToCsv } from '../csv';
import { uploadFileToS3 } from '../s3';

type DiscountToProcess = {
	subName: string;
	firstName: string;
	paymentAmount: number;
	paymentFrequency: string; // Can be narrowed to specific values if needed
	nextPaymentDate: string; // Can be refined to `Date` if parsed
  };
  
  type DiscountProcessingAttempt = {
	status: string; // Can be narrowed to specific statuses if known
  };
  
  type StateMachineEvent = {
	discountsToProcess: DiscountToProcess[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
  };

  
export const handler = async (event: StateMachineEvent) => {
	console.log('event:', event);
	const bucketName = 'discount-expiry-notifier-code';

	const failedRows = [
		{
			name: 'David',
			subName: 'a-S11111111',
		},
		{
			name: 'Rachel',
			subName: 'a-S22222222',
		},
	];

	const content = convertArrayToCsv({
		arr: failedRows.map((row) => ({
			name: row.name,
			subName: row.subName,
		})),
	});

	const filePath = 'abc/def';

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});

	return {
		failedRowsCount: failedRows.length,
		failedRowsFilePath: filePath,
	};
};
