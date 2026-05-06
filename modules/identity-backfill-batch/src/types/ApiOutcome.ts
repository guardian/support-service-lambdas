export type ApiOutcome =
	| { kind: 'success'; identityId: string | null; rawBody: string }
	| { kind: 'rejected'; reason: string; httpStatus: number }
	| { kind: 'error'; reason: string; httpStatus: number | null };
