import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IState } from '../interfaces';

export function saveState(outputDir: string, state: IState): void {
	const path = join(outputDir, 'state.json');
	const payload = {
		processed: [...state.processed],
		rejected: [...state.rejected],
		errored: [...state.errored],
	};
	writeFileSync(path, JSON.stringify(payload, null, 2));
}
