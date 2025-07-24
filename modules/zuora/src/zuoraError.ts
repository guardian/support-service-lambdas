export class ZuoraError extends Error {
	constructor(
		message: string,
		public code: number,
	) {
		super(message);
	}
}
