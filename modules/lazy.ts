import { logger } from '@modules/routing/logger';

export class Lazy<T> {
	private val: Promise<T> | undefined;
	private error: unknown;
	constructor(
		private getValue: () => Promise<T>,
		private message: string | undefined,
	) {}

	public get(): Promise<T> {
		return this.val ?? this.initialise();
	}

	private initialise(err?: unknown): Promise<T> {
		if (this.message) {
			if (this.error === undefined) {
				logger.log('initialising lazy value <' + this.message + '>');
			} else {
				this.error = undefined;
				logger.log(
					'reinitialising lazy value <' + this.message + '> due to error',
					err,
				);
			}
		}
		return (this.val = this.getValue().catch((error) => {
			this.val = undefined;
			this.error = error;
			throw error;
		}));
	}

	public then<B>(f: (t: T) => B): Lazy<B> {
		return new Lazy(() => this.get().then(f), undefined);
	}
}
