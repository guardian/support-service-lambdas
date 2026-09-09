import { brazeTrackResponseSchema } from '../schemas';
import type { BrazeTrackResponse } from '../types';

export const parseBrazeTrackResponse = (
	responseText: string,
): BrazeTrackResponse => {
	try {
		return brazeTrackResponseSchema.parse(
			responseText === '' ? {} : JSON.parse(responseText),
		);
	} catch (error) {
		throw new Error(
			`Invalid response from Braze /users/track: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
};
