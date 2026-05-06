import { responseBodySchema } from '../schemas';

export function extractMessage(text: string): string {
	try {
		const obj = responseBodySchema.parse(JSON.parse(text));
		return obj.message ?? text.slice(0, 300);
	} catch {
		return text.slice(0, 300);
	}
}
