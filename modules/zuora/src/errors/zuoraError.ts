import type { RestResult } from '@modules/zuora/restClient';

export type ZuoraErrorDetail = {
	code: string;
	message: string;
};
export class ZuoraError extends Error {
	public code: number;
	constructor(
		message: string,
		restResult: RestResult,
		public zuoraErrorDetails: ZuoraErrorDetail[],
	) {
		super(message, { cause: restResult });
		this.name = this.constructor.name;
		this.code = restResult.status;
	}
}
