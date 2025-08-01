import {
	codeAndMessageSchema,
	faultCodeAndMessageSchema,
	lowerCaseZuoraErrorSchema,
	upperCaseZuoraErrorSchema,
} from '../types/httpResponse';
import type { ZuoraErrorDetail } from './zuoraError';
import { ZuoraError } from './zuoraError';

export function generateZuoraError(
	json: unknown,
	response: Response,
): ZuoraError {
	const statusText = response.statusText || 'Zuora API Error';

	// Format 1: reasons array (authentication, account errors)
	const lowerCaseParseResult = lowerCaseZuoraErrorSchema.safeParse(json);
	if (lowerCaseParseResult.success) {
		const reasons = lowerCaseParseResult.data.reasons.map((reason) => ({
			code: reason.code.toString(),
			message: reason.message,
		}));
		return new ZuoraError(
			`${statusText}: ${formatReasons(reasons)}`,
			response.status,
			reasons,
		);
	}

	// Format 2: Errors array (object API errors)
	const upperCaseParseResult = upperCaseZuoraErrorSchema.safeParse(json);
	if (upperCaseParseResult.success) {
		const reasons = upperCaseParseResult.data.Errors.map((error) => ({
			code: error.Code,
			message: error.Message,
		}));
		return new ZuoraError(
			`${statusText}: ${formatReasons(reasons)}`,
			response.status,
			reasons,
		);
	}

	// Format 3: FaultCode/FaultMessage (query errors)
	const faultCodeParseResult = faultCodeAndMessageSchema.safeParse(json);
	if (faultCodeParseResult.success) {
		return new ZuoraError(
			`${statusText}: ${faultCodeParseResult.data.FaultCode}: ${faultCodeParseResult.data.FaultMessage}`,
			response.status,
			[
				{
					code: faultCodeParseResult.data.FaultCode,
					message: faultCodeParseResult.data.FaultMessage,
				},
			],
		);
	}

	// Format 4: Simple code/message
	const codeAndMessageParseResult = codeAndMessageSchema.safeParse(json);
	if (codeAndMessageParseResult.success) {
		return new ZuoraError(
			`${statusText}: ${codeAndMessageParseResult.data.code}: ${codeAndMessageParseResult.data.message}`,
			response.status,
			[
				{
					code: codeAndMessageParseResult.data.code,
					message: codeAndMessageParseResult.data.message,
				},
			],
		);
	}

	return new ZuoraError(statusText, response.status, []);
}

function formatReasons(reasons: ZuoraErrorDetail[]): string {
	return reasons
		.map((reason) => `${reason.code}: ${reason.message}`)
		.join('; ');
}
