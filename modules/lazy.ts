import { logger } from '@modules/routing/logger';

export class Lazy<T> {
	private val: Promise<T> | undefined;
	constructor(
		private getValue: () => Promise<T>,
		private message: string | undefined,
	) {}

	public get(): Promise<T> {
		return this.val?.catch((err) => this.initialise(err)) ?? this.initialise();
	}

	private initialise(err?: unknown) {
		if (this.message) {
			if (err === undefined) {
				logger.log('initialising lazy value <' + this.message + '>');
			} else {
				logger.log(
					'reinitialising lazy value <' + this.message + '> due to error',
					err,
				);
			}
		}
		return (this.val = this.getValue());
	}

	public then<B>(f: (t: T) => B): Lazy<B> {
		return new Lazy(() => this.get().then(f), undefined);
	}
}
