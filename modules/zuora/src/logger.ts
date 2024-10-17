export class Logger {
	constructor(private prefix: string[] = []) {}

	public mutableAddContext(value: string): void {
		this.prefix.push(value);
	}

	/* eslint-disable @typescript-eslint/no-explicit-any -- this has to match console.log */
	/* eslint-disable @typescript-eslint/no-unsafe-argument -- this has to match console.log */
	public log(message: any, ...optionalParams: any[]): void {
		console.log(this.getMessage(message), ...optionalParams);
	}

	public error(message?: any, ...optionalParams: any[]): void {
		console.error(this.getMessage(message), ...optionalParams);
	}
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	getMessage(message: any): string {
		return [...this.prefix, message].join(' ');
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */
}
