import { ZuoraError } from '@modules/zuora/errors';

export const zuoraErrorFixture = (code: string, message: string): ZuoraError =>
	new ZuoraError(
		message,
		{ status: 200, responseBody: '', responseHeaders: {} },
		[{ code, message }],
	);
