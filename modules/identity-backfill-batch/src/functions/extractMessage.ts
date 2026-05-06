import { MAX_RESPONSE_PREVIEW_CHARS } from '../constants';
import { responseBodySchema } from '../schemas';

export function extractMessage(text: string): string {
	try {
		const obj = responseBodySchema.parse(JSON.parse(text));
		return obj.message ?? text.slice(0, MAX_RESPONSE_PREVIEW_CHARS);
	} catch {
		return text.slice(0, MAX_RESPONSE_PREVIEW_CHARS);
	}
}
