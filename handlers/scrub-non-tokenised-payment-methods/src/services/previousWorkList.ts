import { getFileFromS3, uploadFileToS3 } from '@modules/aws/s3';
import type { Stage } from '@modules/stage';
import { bucketName, PREVIOUS_WORK_LIST_KEY } from '../constants';
import { paymentMethodsToScrubSchema } from '../schemas';
import type { PaymentMethodToScrub } from '../types';

/**
 * The work list the last real run was given, kept at a fixed key so today's run
 * can tell whether the last one changed anything.
 *
 * Undefined when there is nothing to compare against: the first run after this
 * was added, or the first run after leaving dry run.
 */
export const readPreviousWorkList = async (
	stage: Stage,
): Promise<PaymentMethodToScrub[] | undefined> => {
	try {
		const file = await getFileFromS3({
			bucketName: bucketName(stage),
			filePath: PREVIOUS_WORK_LIST_KEY,
		});

		return paymentMethodsToScrubSchema.parse(JSON.parse(file));
	} catch {
		return undefined;
	}
};

export const savePreviousWorkList = async (
	stage: Stage,
	workList: PaymentMethodToScrub[],
): Promise<void> => {
	await uploadFileToS3({
		bucketName: bucketName(stage),
		filePath: PREVIOUS_WORK_LIST_KEY,
		content: JSON.stringify(workList),
	});
};
