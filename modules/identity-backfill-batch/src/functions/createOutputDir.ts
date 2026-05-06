import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { OUTPUT_BASE_DIR, OUTPUT_PARENT_DIR } from '../constants';
import type { Stage } from '../types';

export function createOutputDir(stage: Stage): string {
	const home = process.env.HOME ?? '.';
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const dir = join(
		home,
		OUTPUT_BASE_DIR,
		OUTPUT_PARENT_DIR,
		`${stage}-${timestamp}`,
	);
	mkdirSync(dir, { recursive: true });
	return dir;
}
