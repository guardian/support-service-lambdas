import { ZuoraError } from './zuoraError';
import type {
	ZuoraResponse,
	ZuoraReason,
	ZuoraErrorItem,
} from './types/httpResponse';

export function generateZuoraError(
	json: ZuoraResponse,
	response: Response,
): ZuoraError {
	const statusText = response.statusText || 'Zuora API Error';

	// Format 1: reasons array (authentication, account errors)
	if (responseHasReasonsArray(json)) {
		return new ZuoraError(
			`${statusText}: ${formatReasons(json.reasons)}`,
			response.status,
		);
	}

	// Format 2: Errors array (object API errors)
	if (responseHasErrorsArray(json)) {
		return new ZuoraError(
			`${statusText}: ${formatErrors(json.Errors)}`,
			response.status,
		);
	}

	// Format 3: FaultCode/FaultMessage (query errors)
	if (responseHasFaultCodeAndFaultMessage(json)) {
		return new ZuoraError(
			`${statusText}: ${json.FaultCode}: ${json.FaultMessage}`,
			response.status,
		);
	}

	// Format 4: Simple code/message
	if (responseHasCodeAndMessage(json)) {
		return new ZuoraError(
			`${statusText}: ${json.code}: ${json.message}`,
			response.status,
		);
	}

	return new ZuoraError(statusText, response.status);
}

function responseHasReasonsArray(
	json: ZuoraResponse,
): json is ZuoraResponse & { reasons: ZuoraReason[] } {
	return Boolean(json.reasons && Array.isArray(json.reasons));
}

function formatReasons(reasons: ZuoraReason[]): string {
	return reasons
		.map((reason: ZuoraReason) => `${reason.code}: ${reason.message}`)
		.join('; ');
}

function responseHasErrorsArray(
	json: ZuoraResponse,
): json is ZuoraResponse & { Errors: ZuoraErrorItem[] } {
	return Boolean(json.Errors && Array.isArray(json.Errors));
}

function formatErrors(errors: ZuoraErrorItem[]): string {
	return errors
		.map((error: ZuoraErrorItem) => `${error.Code}: ${error.Message}`)
		.join('; ');
}

function responseHasFaultCodeAndFaultMessage(
	json: ZuoraResponse,
): json is ZuoraResponse & { FaultCode: string; FaultMessage: string } {
	return Boolean(json.FaultCode && json.FaultMessage);
}

function responseHasCodeAndMessage(
	json: ZuoraResponse,
): json is ZuoraResponse & { code: string; message: string } {
	return Boolean(json.code && json.message);
}
