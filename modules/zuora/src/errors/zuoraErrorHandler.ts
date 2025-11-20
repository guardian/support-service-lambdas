import {
	codeAndMessageSchema,
	faultCodeAndMessageSchema,
	lowerCaseZuoraErrorSchema,
	upperCaseZuoraErrorSchema,
} from '../types/httpResponse';
import type { ZuoraErrorDetail } from './zuoraError';
import { ZuoraError } from './zuoraError';

export function generateZuoraError(json: unknown): ZuoraError {
	// Format 1: reasons array (authentication, account errors)
	const lowerCaseParseResult = lowerCaseZuoraErrorSchema.safeParse(json);
	if (lowerCaseParseResult.success) {
		const reasons = lowerCaseParseResult.data.reasons.map((reason) => ({
			code: reason.code.toString(),
			message: reason.message,
		}));
		return new ZuoraError(`${messageFromErrorDetails(reasons)}`, reasons);
	}

	// Format 2: Errors array (object API errors)
	const upperCaseParseResult = upperCaseZuoraErrorSchema.safeParse(json);
	if (upperCaseParseResult.success) {
		const reasons = upperCaseParseResult.data.Errors.map((error) => ({
			code: error.Code,
			message: error.Message,
		}));
		return new ZuoraError(`${messageFromErrorDetails(reasons)}`, reasons);
	}

	// Format 3: FaultCode/FaultMessage (query errors)
	const faultCodeParseResult = faultCodeAndMessageSchema.safeParse(json);
	if (faultCodeParseResult.success) {
		return new ZuoraError(`${faultCodeParseResult.data.FaultMessage}`, [
			{
				code: faultCodeParseResult.data.FaultCode,
				message: faultCodeParseResult.data.FaultMessage,
			},
		]);
	}

	// Format 4: Simple code/message
	const codeAndMessageParseResult = codeAndMessageSchema.safeParse(json);
	if (codeAndMessageParseResult.success) {
		return new ZuoraError(`${codeAndMessageParseResult.data.message}`, [
			{
				code: codeAndMessageParseResult.data.code,
				message: codeAndMessageParseResult.data.message,
			},
		]);
	}
	// Fallback: unknown error format
	return new ZuoraError('Zuora API Error', []);
}

function messageFromErrorDetails(errorDetails: ZuoraErrorDetail[]): string {
	return errorDetails.map((reason) => reason.message).join('; ');
}
