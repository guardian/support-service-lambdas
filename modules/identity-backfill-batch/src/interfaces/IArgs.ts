import type { FilterMode } from '../types/FilterMode';
import type { Stage } from '../types/Stage';

export interface IArgs {
	stage: Stage;
	csv: string;
	rps: number;
	dryRunOnly: boolean;
	filter: FilterMode;
	limit?: number;
}
