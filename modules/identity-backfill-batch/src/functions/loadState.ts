import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_FILE } from '../constants';
import type { IState } from '../interfaces';
import { stateFileSchema } from '../schemas';

export function loadState(outputDir: string): IState {
	const path = join(outputDir, STATE_FILE);
	if (!existsSync(path)) {
		return { processed: new Set(), rejected: new Set(), errored: new Set() };
	}
	const raw = stateFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
	return {
		processed: new Set(raw.processed ?? []),
		rejected: new Set(raw.rejected ?? []),
		errored: new Set(raw.errored ?? []),
	};
}
