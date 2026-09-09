export type BrazeTrackResponse = {
	message?: string;
	errors?: string[];
} & Record<string, unknown>;
