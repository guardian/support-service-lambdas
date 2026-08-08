import { z } from 'zod';

/**
 * The manifest the distributed map writes when a map run finishes, narrowed to
 * what the state machine passes on and what we read back.
 */
export const mapRunManifestSchema = z.object({
	DestinationBucket: z.string().min(1),
	ResultFiles: z.object({
		SUCCEEDED: z.array(z.object({ Key: z.string().min(1) })).optional(),
	}),
});

export type MapRunManifest = z.infer<typeof mapRunManifestSchema>;

/**
 * A result file is one entry per child execution. Only the Output matters here,
 * and it is a JSON string rather than an object.
 */
export const mapRunResultSchema = z.array(z.object({ Output: z.string() }));

/** The tally one batch reported back. */
export const batchResultSchema = z.object({
	scrubbed: z.number(),
	wouldScrub: z.number(),
	skipped: z.number(),
});
