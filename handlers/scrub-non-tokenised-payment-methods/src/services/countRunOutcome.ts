import { getFileFromS3 } from '@modules/aws/s3';
import { batchResultSchema, mapRunResultSchema } from '../schemas';
import type { MapRunManifest } from '../schemas';
import type { RunOutcome } from '../types';

/**
 * Adds up what a run actually did, by reading back the files the distributed map
 * wrote.
 *
 * Each entry in a result file is one child execution, and its Output is the
 * tally that batch returned. Items that failed have no usable tally, which is
 * fine: they are already reported through the FAILED file and the notification.
 */
export const countRunOutcome = async (
	manifest: MapRunManifest,
): Promise<RunOutcome> => {
	let outcome: RunOutcome = {
		items: 0,
		scrubbed: 0,
		wouldScrub: 0,
		skipped: 0,
	};

	for (const file of manifest.ResultFiles.SUCCEEDED ?? []) {
		const contents = await getFileFromS3({
			bucketName: manifest.DestinationBucket,
			filePath: file.Key,
		});

		for (const entry of mapRunResultSchema.parse(JSON.parse(contents))) {
			const batch = batchResultSchema.safeParse(JSON.parse(entry.Output));
			if (!batch.success) {
				continue;
			}

			outcome = {
				items: outcome.items + 1,
				scrubbed: outcome.scrubbed + batch.data.scrubbed,
				wouldScrub: outcome.wouldScrub + batch.data.wouldScrub,
				skipped: outcome.skipped + batch.data.skipped,
			};
		}
	}

	return outcome;
};
