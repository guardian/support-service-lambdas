import type { Stage } from '../types/Stage';

export interface IArgs {
	stage: Stage;
	csv: string;
	rps: number;
	dryRunOnly: boolean;
	limit?: number;
}
