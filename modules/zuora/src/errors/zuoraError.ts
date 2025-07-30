export class ZuoraError extends Error {
	constructor(
		message: string,
		public code: number,
		public jsonBody?: unknown,
	) {
		super(message);
	}
}
