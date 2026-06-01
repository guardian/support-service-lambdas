import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_FILE } from '../constants';
import type { IState } from '../interfaces';

export function saveState(outputDir: string, state: IState): void {
	const path = join(outputDir, STATE_FILE);
	const payload = {
		processed: [...state.processed],
		rejected: [...state.rejected],
		errored: [...state.errored],
	};
	writeFileSync(path, JSON.stringify(payload, null, 2));
}
