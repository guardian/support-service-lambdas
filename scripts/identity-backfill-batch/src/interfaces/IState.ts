export interface IState {
	processed: Set<string>;
	rejected: Set<string>;
	errored: Set<string>;
}
