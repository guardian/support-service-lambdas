import { uploadFileToS3 } from '@modules/aws/s3';
import { DAILY_SCRUB_LIMIT } from '../constants';
import { findPaymentMethodsToScrub } from '../services';

export const handler = async ({ filePath }: { filePath: string }) => {
	const paymentMethods = await findPaymentMethodsToScrub();
	const count = Array.isArray(paymentMethods) ? paymentMethods.length : 0;

	// Hitting the cap means there is still a backlog to get through. Once runs
	// stop reaching it, we are down to the ongoing trickle.
	console.log(
		`Found ${count} payment methods to scrub, out of a maximum of ${DAILY_SCRUB_LIMIT}`,
	);

	await uploadFileToS3({
		bucketName: process.env.BUCKET_NAME!,
		filePath,
		content: JSON.stringify(paymentMethods),
	});
};
