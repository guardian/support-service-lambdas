import { stageFromEnvironment } from '@modules/stage';
import { mapRunManifestSchema } from '../schemas';
import { countRunOutcome } from '../services';
import type { RunOutcome } from '../types';

/**
 * Third state of the scrub-non-tokenised-payment-methods state machine.
 *
 * Invoked once, after the distributed map, with the manifest that map run wrote.
 *
 * Answers the one question nothing else in the run can answer: did this run
 * actually achieve anything? A scrubbed payment method stops being returned by
 * Zuora, so it is skipped next time, and a run where every item skips looks
 * exactly like a healthy one — the map succeeds, nothing fails, no alarm. If
 * those rows also never leave the BigQuery mirror, the same work list comes back
 * every day and the backlog never moves, quietly.
 *
 * So a run that had work to do and scrubbed none of it fails, loudly. That is
 * the honest signal, whatever the cause: a stalled mirror, Zuora refusing every
 * call, or a selection that no longer matches reality.
 *
 * Deliberately says nothing about an empty work list: once the backlog is
 * drained most days will legitimately have nothing to do.
 *
 * Skipped in dry run, where by definition nothing is ever scrubbed.
 */
export const handler = async (event: unknown): Promise<RunOutcome> => {
	const manifest = mapRunManifestSchema.parse(event);
	const outcome = await countRunOutcome(manifest);

	console.log(
		`Run finished: ${outcome.items} item(s), ${outcome.scrubbed} scrubbed, ${outcome.wouldScrub} would have been scrubbed, ${outcome.skipped} skipped`,
	);

	const dryRun = process.env.DRY_RUN === 'true';

	if (!dryRun && outcome.items > 0 && outcome.scrubbed === 0) {
		throw new Error(
			`This run had ${outcome.items} payment method(s) to get through and scrubbed none of them, so the backlog has not moved. Check whether scrubbed methods are leaving the BigQuery mirror, and whether Zuora is answering. Stage: ${stageFromEnvironment()}.`,
		);
	}

	return outcome;
};
