/** The tally a batch reports back to the state machine. */
export type BatchResult = {
	scrubbed: number;
	wouldScrub: number;
	skipped: number;
};
