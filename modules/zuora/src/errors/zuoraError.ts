export type ZuoraErrorDetail = {
	code: string;
	message: string;
};
export class ZuoraError extends Error {
	constructor(
		message: string,
		public code: number,
		public zuoraErrorDetails: ZuoraErrorDetail[],
	) {
		super(message);
		this.name = 'ZuoraError';
	}
}
