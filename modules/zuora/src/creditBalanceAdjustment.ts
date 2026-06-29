import type { z } from 'zod';
import type { ZuoraUpperCaseSuccess } from './types';
import { zuoraUpperCaseSuccessSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export async function applyCreditToAccountBalance(
	zuoraClient: ZuoraClient,
	body: string,
): Promise<ZuoraUpperCaseSuccess>;
export async function applyCreditToAccountBalance<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	body: string,
	schema: T,
): Promise<z.infer<T>>;
export async function applyCreditToAccountBalance<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<ZuoraUpperCaseSuccess | z.infer<T>> {
	const path = `/v1/object/credit-balance-adjustment`;
	if (schema === undefined) {
		return zuoraClient.post(path, body, zuoraUpperCaseSuccessSchema);
	}
	return zuoraClient.post(path, body, schema);
}
