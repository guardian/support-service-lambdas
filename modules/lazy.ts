export class Lazy<T> {
	private val: Promise<T> | undefined;
	constructor(
		private getValue: () => Promise<T>,
		private message: string,
	) {}

	public get(): Promise<T> {
		if (this.val === undefined) {
			console.log('initialising lazy value <' + this.message + '>');
		}
		return this.val ?? (this.val = this.getValue());
	}

	public then<B>(f: (t: T) => B | PromiseLike<B>): Lazy<B> {
		return new Lazy(() => this.get().then(f), this.message);
	}
}
